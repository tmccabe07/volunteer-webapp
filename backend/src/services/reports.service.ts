import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import prisma from '../utils/prisma';
import {
  ParticipationReportQuery,
  AdminTaskReportQuery,
  UpcomingEventsReportQuery,
} from '../utils/validation/reports.schema';

/**
 * ReportsService: Generate volunteer participation and administrative task reports
 * Feature: 001-volunteer-management - User Story 9
 */
@Injectable()
export class ReportsService {
  private prisma: PrismaClient = prisma;

  /**
   * Generate participation report showing volunteer event participation and points earned
   * @param query Report filter parameters (date range, rank level, format)
   * @returns Participation report in summary or detailed format
   */
  async generateParticipationReport(query: ParticipationReportQuery) {
    // Default to current year if dates not provided
    const packConfig = await this.prisma.packConfig.findFirst();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : packConfig
      ? new Date(packConfig.yearStartDate)
      : new Date(new Date().getFullYear(), 0, 1);
    const endDate = query.endDate
      ? new Date(query.endDate)
      : packConfig
      ? new Date(packConfig.yearEndDate)
      : new Date(new Date().getFullYear(), 11, 31);

    // Build event filter
    const eventFilter: any = {
      eventDate: { gte: startDate, lte: endDate },
      isComplete: true,
      deletedAt: null,
    };

    if (query.rankLevel && query.rankLevel !== 'PACK_WIDE') {
      eventFilter.rankLevel = query.rankLevel;
    }

    // Fetch events in date range
    const events = await this.prisma.event.findMany({
      where: eventFilter,
      include: {
        activitySlots: {
          include: {
            activityType: true,
            signups: {
              where: { withdrawn: false, deletedAt: null },
              include: {
                volunteer: {
                  include: {
                    volunteerRoles: {
                      where: { removedAt: null },
                      include: { role: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Fetch point events in date range
    const pointEvents = await this.prisma.pointEvent.findMany({
      where: {
        eventType: 'EVENT_PARTICIPATION',
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        volunteer: true,
        activityType: true,
      },
    });

    if (query.format === 'detailed') {
      return this.buildDetailedParticipationReport(
        events,
        pointEvents,
        startDate,
        endDate
      );
    } else {
      return this.buildSummaryParticipationReport(
        events,
        pointEvents,
        startDate,
        endDate
      );
    }
  }

  /**
   * Build summary participation report with high-level statistics
   */
  private buildSummaryParticipationReport(
    events: any[],
    pointEvents: any[],
    startDate: Date,
    endDate: Date
  ) {
    // Calculate totals
    const totalEvents = events.length;
    const allSignups = events.flatMap((e) =>
      e.activitySlots.flatMap((slot: any) => slot.signups)
    );
    const totalSignups = allSignups.length;
    const uniqueVolunteers = new Set(
      allSignups.map((s: any) => s.volunteerId)
    );

    // Aggregate points by volunteer
    const volunteerPoints = new Map<
      string,
      { volunteer: any; eventsParticipated: number; pointsEarned: number }
    >();

    for (const signup of allSignups) {
      const volunteerId = signup.volunteerId;
      if (!volunteerPoints.has(volunteerId)) {
        volunteerPoints.set(volunteerId, {
          volunteer: signup.volunteer,
          eventsParticipated: 0,
          pointsEarned: 0,
        });
      }
      const data = volunteerPoints.get(volunteerId)!;
      data.eventsParticipated++;
    }

    // Add points earned
    for (const pointEvent of pointEvents) {
      const volunteerId = pointEvent.volunteerId;
      if (volunteerPoints.has(volunteerId)) {
        volunteerPoints.get(volunteerId)!.pointsEarned += pointEvent.points;
      }
    }

    // Get top 10 volunteers by points
    const topVolunteers = Array.from(volunteerPoints.values())
      .sort((a, b) => b.pointsEarned - a.pointsEarned)
      .slice(0, 10)
      .map((data) => ({
        volunteer: {
          id: data.volunteer.id,
          name: data.volunteer.name,
        },
        eventsParticipated: data.eventsParticipated,
        pointsEarned: data.pointsEarned,
      }));

    // Participation by rank
    const rankStats = new Map<string, { eventsHeld: number; totalSignups: number }>();
    for (const event of events) {
      const rankLevel = event.rankLevel || 'PACK_WIDE';
      if (!rankStats.has(rankLevel)) {
        rankStats.set(rankLevel, { eventsHeld: 0, totalSignups: 0 });
      }
      const stats = rankStats.get(rankLevel)!;
      stats.eventsHeld++;
      stats.totalSignups += event.activitySlots.reduce(
        (sum: number, slot: any) => sum + slot.signups.length,
        0
      );
    }

    const participationByRank = Array.from(rankStats.entries()).map(
      ([rankLevel, stats]) => ({
        rankLevel,
        eventsHeld: stats.eventsHeld,
        totalSignups: stats.totalSignups,
      })
    );

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      stats: {
        totalVolunteers: uniqueVolunteers.size,
        totalEvents,
        totalSignups,
        averageSignupsPerEvent:
          totalEvents > 0 ? totalSignups / totalEvents : 0,
        uniqueVolunteersParticipated: uniqueVolunteers.size,
      },
      topVolunteers,
      participationByRank,
    };
  }

  /**
   * Build detailed participation report showing individual volunteer activities
   */
  private buildDetailedParticipationReport(
    events: any[],
    pointEvents: any[],
    startDate: Date,
    endDate: Date
  ) {
    // Group signups and points by volunteer
    const volunteerData = new Map<string, any>();

    // Collect signups
    for (const event of events) {
      for (const slot of event.activitySlots) {
        for (const signup of slot.signups) {
          const volunteerId = signup.volunteerId;
          if (!volunteerData.has(volunteerId)) {
            volunteerData.set(volunteerId, {
              volunteer: {
                id: signup.volunteer.id,
                name: signup.volunteer.name,
                email: signup.volunteer.email,
                roles: signup.volunteer.volunteerRoles.map((vtr: any) => ({
                  name: vtr.role.name,
                })),
              },
              eventsParticipated: 0,
              pointsEarned: 0,
              activities: [],
            });
          }

          const data = volunteerData.get(volunteerId)!;
          data.eventsParticipated++;
          data.activities.push({
            event: {
              id: event.id,
              title: event.title,
              eventDate: event.eventDate.toISOString(),
            },
            activityType: slot.activityType.name,
            points: slot.activityType.pointValue,
          });
        }
      }
    }

    // Add points earned
    for (const pointEvent of pointEvents) {
      if (volunteerData.has(pointEvent.volunteerId)) {
        volunteerData.get(pointEvent.volunteerId)!.pointsEarned +=
          pointEvent.points;
      }
    }

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      volunteers: Array.from(volunteerData.values()),
    };
  }

  /**
   * Generate administrative task completion report
   * @param query Report filter parameters (date range, status, task ID, format)
   * @returns Admin task report in summary or detailed format
   */
  async generateAdminTaskReport(query: AdminTaskReportQuery) {
    // Default to current year if dates not provided
    const packConfig = await this.prisma.packConfig.findFirst();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : packConfig
      ? new Date(packConfig.yearStartDate)
      : new Date(new Date().getFullYear(), 0, 1);
    const endDate = query.endDate
      ? new Date(query.endDate)
      : packConfig
      ? new Date(packConfig.yearEndDate)
      : new Date(new Date().getFullYear(), 11, 31);

    // Build task filter
    const taskFilter: any = {
      dueDate: { gte: startDate, lte: endDate },
      deletedAt: null,
    };

    if (query.taskId) {
      taskFilter.id = query.taskId;
    }

    // Fetch tasks
    const tasks = await this.prisma.adminTask.findMany({
      where: taskFilter,
      include: {
        assignedRoles: {
          include: {
            role: {
              include: {
                volunteers: {
                  where: { removedAt: null },
                  include: {
                    volunteer: {
                      include: {
                        volunteerRoles: {
                          where: { removedAt: null },
                          include: { role: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        completions: {
          include: {
            volunteer: {
              include: {
                volunteerRoles: {
                  where: { removedAt: null },
                  include: { role: true },
                },
              },
            },
          },
        },
      },
    });

    // Apply status filter at application level
    const now = new Date();
    let filteredTasks = tasks;

    if (query.status === 'overdue') {
      filteredTasks = tasks.filter((task) => new Date(task.dueDate) < now);
    } else if (query.status === 'complete') {
      // Tasks where all assigned volunteers have completed
      filteredTasks = tasks.filter((task) => {
        const assignedVolunteers = this.getAssignedVolunteers(task);
        const completedVolunteers = new Set(
          task.completions.map((c) => c.volunteerId)
        );
        return (
          assignedVolunteers.length > 0 &&
          assignedVolunteers.every((v) => completedVolunteers.has(v.id))
        );
      });
    } else if (query.status === 'incomplete') {
      // Tasks where at least one assigned volunteer has not completed
      filteredTasks = tasks.filter((task) => {
        const assignedVolunteers = this.getAssignedVolunteers(task);
        const completedVolunteers = new Set(
          task.completions.map((c) => c.volunteerId)
        );
        return assignedVolunteers.some((v) => !completedVolunteers.has(v.id));
      });
    }

    if (query.format === 'detailed') {
      return this.buildDetailedAdminTaskReport(filteredTasks, startDate, endDate);
    } else {
      return this.buildSummaryAdminTaskReport(filteredTasks, startDate, endDate);
    }
  }

  /**
   * Get list of volunteers assigned to a task through their roles
   */
  private getAssignedVolunteers(task: any): any[] {
    const volunteers = new Map<string, any>();

    for (const assignedRole of task.assignedRoles) {
      for (const volunteerToRole of assignedRole.role.volunteers) {
        const volunteer = volunteerToRole.volunteer;
        if (!volunteers.has(volunteer.id)) {
          volunteers.set(volunteer.id, volunteer);
        }
      }
    }

    return Array.from(volunteers.values());
  }

  /**
   * Build summary admin task report with statistics
   */
  private buildSummaryAdminTaskReport(
    tasks: any[],
    startDate: Date,
    endDate: Date
  ) {
    const now = new Date();
    let totalCompletions = 0;
    let totalAssignments = 0;
    let overdueTasks = 0;

    const taskBreakdown = tasks.map((task) => {
      const assignedVolunteers = this.getAssignedVolunteers(task);
      const completedVolunteers = new Set(
        task.completions.map((c: any) => c.volunteerId)
      );
      const assignedCount = assignedVolunteers.length;
      const completedCount = task.completions.length;
      const completionRate =
        assignedCount > 0 ? (completedCount / assignedCount) * 100 : 0;
      const isOverdue = new Date(task.dueDate) < now;

      totalAssignments += assignedCount;
      totalCompletions += completedCount;
      if (isOverdue) overdueTasks++;

      return {
        task: {
          id: task.id,
          name: task.name,
          dueDate: task.dueDate.toISOString(),
        },
        assignedCount,
        completedCount,
        completionRate,
        isOverdue,
      };
    });

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      stats: {
        totalTasks: tasks.length,
        totalCompletions,
        overallCompletionRate:
          totalAssignments > 0 ? (totalCompletions / totalAssignments) * 100 : 0,
        overdueTasks,
      },
      taskBreakdown,
    };
  }

  /**
   * Build detailed admin task report showing individual volunteer completion status
   */
  private buildDetailedAdminTaskReport(
    tasks: any[],
    startDate: Date,
    endDate: Date
  ) {
    const now = new Date();

    const taskDetails = tasks.map((task) => {
      const assignedVolunteers = this.getAssignedVolunteers(task);
      const completedMap = new Map<string, Date>(
        task.completions.map((c: any) => [c.volunteerId, c.completedAt as Date])
      );

      const assignedVolunteersWithStatus = assignedVolunteers.map(
        (volunteer) => {
          const completedAt = completedMap.get(volunteer.id);
          return {
            volunteer: {
              id: volunteer.id,
              name: volunteer.name,
              email: volunteer.email,
              roles: volunteer.volunteerRoles.map((vtr: any) => ({
                name: vtr.role.name,
              })),
            },
            completedAt: completedAt ? completedAt.toISOString() : null,
            isComplete: completedMap.has(volunteer.id),
          };
        }
      );

      const completedCount = assignedVolunteersWithStatus.filter(
        (v) => v.isComplete
      ).length;
      const assignedCount = assignedVolunteersWithStatus.length;

      return {
        task: {
          id: task.id,
          name: task.name,
          description: task.description,
          dueDate: task.dueDate.toISOString(),
          isOverdue: new Date(task.dueDate) < now,
        },
        assignedVolunteers: assignedVolunteersWithStatus,
        stats: {
          assignedCount,
          completedCount,
          completionRate:
            assignedCount > 0 ? (completedCount / assignedCount) * 100 : 0,
        },
      };
    });

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      tasks: taskDetails,
    };
  }

  /**
   * Generate upcoming events report showing future events and volunteer signups
   * @param query Report filter parameters (date range, rank level)
   * @returns Upcoming events report with signups
   */
  async generateUpcomingEventsReport(query: UpcomingEventsReportQuery) {
    const now = new Date();
    
    // Default to today through end of current year if dates not provided
    const packConfig = await this.prisma.packConfig.findFirst();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : now;
    const endDate = query.endDate
      ? new Date(query.endDate)
      : packConfig
      ? new Date(packConfig.yearEndDate)
      : new Date(new Date().getFullYear(), 11, 31);

    // Build event filter
    const eventFilter: any = {
      eventDate: { gte: startDate, lte: endDate },
      isComplete: false, // Only upcoming/incomplete events
      deletedAt: null,
    };

    if (query.rankLevel && query.rankLevel !== 'PACK_WIDE') {
      eventFilter.rankLevel = query.rankLevel;
    }

    // Fetch upcoming events
    const events = await this.prisma.event.findMany({
      where: eventFilter,
      orderBy: { eventDate: 'asc' },
      include: {
        activitySlots: {
          include: {
            activityType: true,
            signups: {
              where: { withdrawn: false, deletedAt: null },
              include: {
                volunteer: {
                  include: {
                    volunteerRoles: {
                      where: { removedAt: null },
                      include: { role: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Format the report
    const eventsWithSignups = events.map((event) => {
      const activitySlots = event.activitySlots.map((slot: any) => {
        const signups = slot.signups.map((signup: any) => ({
          volunteer: {
            id: signup.volunteer.id,
            name: signup.volunteer.name,
            email: signup.volunteer.email,
            roles: signup.volunteer.volunteerRoles.map((vtr: any) => ({
              name: vtr.role.name,
            })),
          },
          signupDate: signup.createdAt.toISOString(),
        }));

        return {
          id: slot.id,
          activityType: slot.activityType.name,
          capacity: slot.capacity,
          signupsCount: signups.length,
          spotsRemaining: slot.capacity ? slot.capacity - signups.length : null,
          signups,
        };
      });

      const totalSignups = activitySlots.reduce(
        (sum: number, slot: any) => sum + slot.signupsCount,
        0
      );

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        eventDate: event.eventDate.toISOString(),
        location: event.location,
        rankLevel: event.rankLevel || 'PACK_WIDE',
        activitySlots,
        totalSignups,
      };
    });

    // Summary statistics
    const totalEvents = events.length;
    const totalSignups = eventsWithSignups.reduce(
      (sum, event) => sum + event.totalSignups,
      0
    );
    const uniqueVolunteers = new Set(
      events.flatMap((e) =>
        e.activitySlots.flatMap((slot: any) =>
          slot.signups.map((s: any) => s.volunteerId)
        )
      )
    );

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalEvents,
        totalSignups,
        uniqueVolunteers: uniqueVolunteers.size,
        averageSignupsPerEvent: totalEvents > 0 ? totalSignups / totalEvents : 0,
      },
      events: eventsWithSignups,
    };
  }
}
