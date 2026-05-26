/**
 * EventService
 * 
 * Handles event CRUD operations, recurring event year-end date logic,
 * and event completion workflow per User Story 4
 */

import { Injectable } from '@nestjs/common';
import { PointEventType, NotificationType, EventScope, AuthTier, RoleScope } from '@prisma/client';
import prisma from '../utils/prisma';
import type { CreateEventInput, UpdateEventInput, CompleteEventInput } from '../utils/validation/event.schema';
import { NotificationService } from './notification.service';
import { validateEventTimes } from '../utils/time-validation.util';

@Injectable()
export class EventService {
  constructor(private readonly notificationService: NotificationService) {}

  private deriveRankLevels(event: { targetDens?: Array<{ den: { rankLevel: string } }>; rankLevel?: string | null }): string[] {
    const targetDenRanks = [...new Set((event.targetDens || []).map((target) => target.den.rankLevel))];
    if (targetDenRanks.length > 0) {
      return targetDenRanks;
    }
    return event.rankLevel ? [event.rankLevel] : [];
  }

  private async getAccessibleDenIds(userId: string, authTier: string): Promise<string[]> {
    if (authTier === AuthTier.ADMIN) {
      const dens = await prisma.den.findMany({
        where: { isActive: true, deletedAt: null },
        select: { id: true },
      });
      return dens.map((d) => d.id);
    }

    const assignments = await prisma.volunteerToRole.findMany({
      where: {
        volunteerId: userId,
        removedAt: null,
        role: {
          deletedAt: null,
          grantsTier: {
            in: [AuthTier.LEADER, AuthTier.ADMIN],
          },
        },
      },
      include: {
        role: {
          select: {
            scopeType: true,
            rankLevel: true,
          },
        },
      },
    });

    if (assignments.some((a) => a.role.scopeType === 'PACK')) {
      const dens = await prisma.den.findMany({
        where: { isActive: true, deletedAt: null },
        select: { id: true },
      });
      return dens.map((d) => d.id);
    }

    const denIds = new Set<string>();
    const denNumbers = new Set<number>();
    const rankLevels = new Set<string>();

    for (const assignment of assignments) {
      if (assignment.denId) {
        denIds.add(assignment.denId);
      }
      if (assignment.denNumber) {
        denNumbers.add(assignment.denNumber);
      }
      if (assignment.role.scopeType === 'RANK' && assignment.role.rankLevel) {
        rankLevels.add(assignment.role.rankLevel);
      }
    }

    const denRows = await prisma.den.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        OR: [
          ...(denIds.size > 0 ? [{ id: { in: Array.from(denIds) } }] : []),
          ...(denNumbers.size > 0 ? [{ denNumber: { in: Array.from(denNumbers) } }] : []),
          ...(rankLevels.size > 0 ? [{ rankLevel: { in: Array.from(rankLevels) as any } }] : []),
        ],
      },
      select: { id: true },
    });

    return denRows.map((d) => d.id);
  }

  private async validateAndResolveDenTargets(
    scopeType: EventScope,
    targetDenIds: string[] | undefined,
    userId: string,
    authTier: string,
  ): Promise<string[]> {
    if (scopeType !== EventScope.DEN) {
      return [];
    }

    const accessibleDenIds = await this.getAccessibleDenIds(userId, authTier);
    if (accessibleDenIds.length === 0) {
      throw new Error('No accessible dens found for this user');
    }

    const requestedDenIds = targetDenIds && targetDenIds.length > 0
      ? [...new Set(targetDenIds)]
      : accessibleDenIds.length === 1
      ? [accessibleDenIds[0]]
      : [];

    if (requestedDenIds.length === 0) {
      throw new Error('At least one den must be selected for den-scoped events');
    }

    const invalid = requestedDenIds.filter((id) => !accessibleDenIds.includes(id));
    if (invalid.length > 0) {
      throw new Error('One or more selected dens are outside your scope');
    }

    return requestedDenIds;
  }

  private async validatePlannedRequirements(
    requirementIds: string[] | undefined,
    scopeType: EventScope,
    targetDenIds: string[],
  ): Promise<string[]> {
    const uniqueRequirementIds = [...new Set(requirementIds || [])];
    if (uniqueRequirementIds.length === 0) {
      return [];
    }

    const existingRequirements = await prisma.requirement.findMany({
      where: { id: { in: uniqueRequirementIds } },
      select: { id: true },
    });

    if (existingRequirements.length !== uniqueRequirementIds.length) {
      throw new Error('One or more planned requirements do not exist');
    }

    if (scopeType === EventScope.DEN && targetDenIds.length > 0) {
      const targetDens = await prisma.den.findMany({
        where: { id: { in: targetDenIds }, deletedAt: null, isActive: true },
        select: { rankLevel: true },
      });

      const allowedRanks = new Set(targetDens.map((den) => den.rankLevel));

      const requirementRanks = await prisma.requirement.findMany({
        where: { id: { in: uniqueRequirementIds } },
        select: {
          id: true,
          adventure: {
            select: {
              rank: {
                select: { rankLevel: true },
              },
            },
          },
        },
      });

      const invalidRequirementExists = requirementRanks.some(
        (requirement) => !allowedRanks.has(requirement.adventure.rank.rankLevel)
      );

      if (invalidRequirementExists) {
        throw new Error('Planned requirements must match the selected den rank(s)');
      }
    }

    return uniqueRequirementIds;
  }

  /**
   * Create a new event
   * Auto-sets recurringEndDate from PackConfig if isRecurring=true
   */
  async createEvent(data: CreateEventInput, createdById: string, creatorTier: string) {
    const {
      activitySlots,
      targetDenIds,
      plannedRequirementIds,
      scopeType = EventScope.PACK_WIDE,
      ...eventData
    } = data;

    // Validate activitySlots exist
    if (!activitySlots || activitySlots.length === 0) {
      throw new Error('At least one activity slot is required');
    }

    // Validate activity types exist
    const activityTypeIds = activitySlots.map(slot => slot.activityTypeId);
    const uniqueActivityTypeIds = [...new Set(activityTypeIds)];
    const existingActivityTypes = await prisma.activityType.findMany({
      where: {
        id: { in: uniqueActivityTypeIds },
        deletedAt: null,
      },
    });

    if (existingActivityTypes.length !== uniqueActivityTypeIds.length) {
      throw new Error('One or more activity types do not exist');
    }

    const resolvedTargetDenIds = await this.validateAndResolveDenTargets(
      scopeType,
      targetDenIds,
      createdById,
      creatorTier,
    );

    const validatedPlannedRequirementIds = await this.validatePlannedRequirements(
      plannedRequirementIds,
      scopeType,
      resolvedTargetDenIds,
    );

    // Get recurring end date from pack config if recurring
    let recurringEndDate: Date | null = null;
    if (data.isRecurring) {
      const packConfig = await prisma.packConfig.findFirst();
      if (packConfig) {
        recurringEndDate = packConfig.yearEndDate;
      }
    }

    // Create event with activity slots
    const event = await prisma.event.create({
      data: {
        ...eventData,
        scopeType,
        rankLevel: eventData.rankLevel || null,
        recurringEndDate,
        createdById,
        targetDens:
          resolvedTargetDenIds.length > 0
            ? {
                create: resolvedTargetDenIds.map((denId) => ({ denId })),
              }
            : undefined,
        plannedRequirements:
          validatedPlannedRequirementIds.length > 0
            ? {
                create: validatedPlannedRequirementIds.map((requirementId) => ({ requirementId })),
              }
            : undefined,
        activitySlots: {
          create: activitySlots.map(slot => ({
            activityTypeId: slot.activityTypeId,
            capacity: slot.capacity ?? null,
            description: slot.description ?? null,
            steps: slot.steps && slot.steps.length > 0 ? {
              create: slot.steps.map((step, index) => ({
                orderIndex: index,
                stepText: step.stepText,
              })),
            } : undefined,
          })),
        },
      },
      include: {
        activitySlots: {
          include: {
            activityType: true,
            steps: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        targetDens: {
          include: {
            den: {
              select: {
                id: true,
                name: true,
                denNumber: true,
                rankLevel: true,
              },
            },
          },
        },
        plannedRequirements: {
          include: {
            requirement: {
              include: {
                adventure: {
                  select: {
                    id: true,
                    name: true,
                    rank: {
                      select: {
                        rankLevel: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Send notifications to relevant volunteers
    await this.notifyRelevantVolunteers(event);

    return {
      ...event,
      derivedRankLevels: this.deriveRankLevels(event),
    };
  }

  /**
   * Send notifications to volunteers who should know about a new event
   * - Pack-wide events: notify all active volunteers
    * - Den-scoped events: notify associated den parents and leaders
   */
  private async notifyRelevantVolunteers(event: any) {
    try {
      // Format event date for notification message
      const eventDate = new Date(event.eventDate);
      const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      const message = `New event: ${event.title} on ${formattedDate}`;
      const link = `/events/${event.id}`;

      let targetVolunteers: string[] = [];

      if (event.scopeType === EventScope.PACK_WIDE) {
        // Pack-wide event: notify all active volunteers
        const volunteers = await prisma.volunteer.findMany({
          where: { deletedAt: null },
          select: { id: true },
        });
        targetVolunteers = volunteers.map(v => v.id);
      } else {
        // Den-scoped event: notify den-associated parents and leaders.
        const eventTargetDens: Array<{
          denId?: string;
          den?: { id: string; denNumber: number; rankLevel: string };
        }> = event.targetDens || [];

        const targetDenIds: string[] = [
          ...new Set(
            eventTargetDens
              .map((target) => target.denId || target.den?.id)
              .filter((denId): denId is string => typeof denId === 'string' && denId.length > 0)
          ),
        ];

        const targetDenNumbers: number[] = [
          ...new Set(
            eventTargetDens
              .map((target) => target.den?.denNumber)
              .filter((denNumber): denNumber is number => typeof denNumber === 'number')
          ),
        ];

        const targetDenRanks: string[] = [
          ...new Set(
            eventTargetDens
              .map((target) => target.den?.rankLevel)
              .filter((rankLevel): rankLevel is string => typeof rankLevel === 'string' && rankLevel.length > 0)
          ),
        ];

        if (targetDenIds.length === 0) {
          return;
        }

        const [leaderAssignments, parentLinks] = await Promise.all([
          prisma.volunteerToRole.findMany({
            where: {
              removedAt: null,
              volunteer: { deletedAt: null },
              role: {
                deletedAt: null,
                grantsTier: { in: [AuthTier.LEADER, AuthTier.ADMIN] },
              },
              OR: [
                { denId: { in: targetDenIds } },
                ...(targetDenNumbers.length > 0 ? [{ denNumber: { in: targetDenNumbers } }] : []),
                ...(targetDenRanks.length > 0
                  ? [{ role: { scopeType: RoleScope.RANK, rankLevel: { in: targetDenRanks as any } } }]
                  : []),
                { role: { scopeType: RoleScope.PACK } },
              ],
            },
            select: { volunteerId: true },
          }),
          prisma.parentChildLink.findMany({
            where: {
              status: 'APPROVED',
              parent: { deletedAt: null },
              childScout: {
                deletedAt: null,
                isActive: true,
                denMemberships: {
                  some: {
                    validTo: null,
                    denId: { in: targetDenIds },
                  },
                },
              },
            },
            select: { parentId: true },
          }),
        ]);

        targetVolunteers = [
          ...new Set([
            ...leaderAssignments.map((assignment) => assignment.volunteerId),
            ...parentLinks.map((link) => link.parentId),
          ]),
        ];
      }

      // Create notifications for all target volunteers (excluding the event creator)
      const notifications = targetVolunteers
        .filter(id => id !== event.createdById)
        .map(volunteerId => ({
          volunteerId,
          type: NotificationType.NEW_EVENT,
          message,
          link,
          isRead: false,
        }));

      if (notifications.length > 0) {
        await prisma.notification.createMany({
          data: notifications,
        });
      }
    } catch (error) {
      // Log error but don't fail event creation if notifications fail
      console.error('Failed to send event notifications:', error);
    }
  }

  /**
   * Update an existing event
   * Prevents modification if event is already complete
   */
  async updateEvent(eventId: string, data: UpdateEventInput) {
    // Check if event exists and is not complete
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId, deletedAt: null },
    });

    if (!existingEvent) {
      throw new Error('Event not found');
    }

    if (existingEvent.isComplete) {
      throw new Error('Cannot modify completed events');
    }

    // Validate time constraints if any time fields are being updated
    if (data.eventTime !== undefined || data.endTime !== undefined || data.fullDay !== undefined) {
      // Merge existing times with updates
      const mergedEventTime = data.eventTime !== undefined ? data.eventTime : existingEvent.eventTime;
      const mergedEndTime = data.endTime !== undefined ? data.endTime : existingEvent.endTime;
      const mergedFullDay = data.fullDay !== undefined ? data.fullDay : existingEvent.fullDay;
      
      const result = validateEventTimes(
        mergedEventTime,
        mergedEndTime,
        mergedFullDay
      );
      
      if (!result.valid) {
        throw new Error(result.error || 'Invalid time configuration');
      }
    }

    const {
      activitySlots,
      targetDenIds,
      scopeType,
      plannedRequirementIds,
      ...eventData
    } = data;

    if (scopeType !== undefined || targetDenIds !== undefined) {
      throw new Error('Event scope and target dens cannot be changed after creation');
    }

    const existingTargetDenIds =
      existingEvent.scopeType === EventScope.DEN
        ? (
            await prisma.eventTargetDen.findMany({
              where: { eventId: existingEvent.id },
              select: { denId: true },
            })
          ).map((entry) => entry.denId)
        : [];

    const validatedPlannedRequirementIds = plannedRequirementIds
      ? await this.validatePlannedRequirements(
          plannedRequirementIds,
          existingEvent.scopeType,
          existingTargetDenIds,
        )
      : undefined;

    // If activity slots are being updated, validate them
    if (activitySlots) {
      const activityTypeIds = activitySlots.map(slot => slot.activityTypeId);
      const uniqueActivityTypeIds = [...new Set(activityTypeIds)];
      const existingActivityTypes = await prisma.activityType.findMany({
        where: {
          id: { in: uniqueActivityTypeIds },
          deletedAt: null,
        },
      });

      if (existingActivityTypes.length !== uniqueActivityTypeIds.length) {
        throw new Error('One or more activity types do not exist');
      }

      // Delete existing slots and create new ones
      await prisma.activitySlot.deleteMany({
        where: { eventId },
      });
    }

    // Update recurring end date if isRecurring changed
    let recurringEndDate: Date | null | undefined = undefined;
    if (data.isRecurring === true && !existingEvent.recurringEndDate) {
      const packConfig = await prisma.packConfig.findFirst();
      if (packConfig) {
        recurringEndDate = packConfig.yearEndDate;
      }
    } else if (data.isRecurring === false) {
      recurringEndDate = null;
    }

    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        ...eventData,
        ...(recurringEndDate !== undefined && { recurringEndDate }),
        ...(validatedPlannedRequirementIds && {
          plannedRequirements: {
            deleteMany: {},
            create: validatedPlannedRequirementIds.map((requirementId) => ({ requirementId })),
          },
        }),
        ...(activitySlots && {
          activitySlots: {
            create: activitySlots.map(slot => ({
              activityTypeId: slot.activityTypeId,
              capacity: slot.capacity ?? null,
              description: slot.description ?? null,
            })),
          },
        }),
      },
      include: {
        activitySlots: {
          include: {
            activityType: true,
          },
        },
        targetDens: {
          include: {
            den: {
              select: {
                id: true,
                name: true,
                denNumber: true,
                rankLevel: true,
              },
            },
          },
        },
        plannedRequirements: {
          include: {
            requirement: {
              include: {
                adventure: {
                  select: {
                    id: true,
                    name: true,
                    rank: {
                      select: {
                        rankLevel: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      ...event,
      derivedRankLevels: this.deriveRankLevels(event),
    };
  }

  /**
   * Mark event as complete and award points to participants
   */
  async completeEvent(eventId: string, data: CompleteEventInput, completedById: string) {
    // Check if event exists and is not already complete
    const event = await prisma.event.findUnique({
      where: { id: eventId, deletedAt: null },
      include: {
        activitySlots: {
          include: {
            activityType: true,
            signups: {
              where: { withdrawn: false },
              include: {
                volunteer: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.isComplete) {
      throw new Error('Event is already marked complete');
    }

    const pointsAwarded: Array<{
      volunteerId: string;
      volunteerName: string;
      points: number;
      activityType: string;
    }> = [];

    // Award points to existing signups (non-withdrawn and not excluded)
    const excludedIds = data.excludedSignupIds || [];
    for (const slot of event.activitySlots) {
      for (const signup of slot.signups) {
        // Skip if this signup is in the excluded list
        if (excludedIds.includes(signup.id)) {
          continue;
        }
        
        await prisma.pointEvent.create({
          data: {
            volunteerId: signup.volunteerId,
            points: slot.activityType.pointValue,
            eventType: PointEventType.EVENT_PARTICIPATION,
            referenceId: event.id,
            createdById: completedById,
            reason: `Event participation: ${event.title} - ${slot.activityType.name}`,
            activityTypeId: slot.activityType.id,
          },
        });

        // Update point balance
        await this.updatePointBalance(signup.volunteerId, slot.activityType.pointValue);

        pointsAwarded.push({
          volunteerId: signup.volunteerId,
          volunteerName: signup.volunteer.name,
          points: slot.activityType.pointValue,
          activityType: slot.activityType.name,
        });
      }
    }

    // Add manual volunteers if provided
    if (data.manualVolunteers) {
      for (const manual of data.manualVolunteers) {
        // Create signup record
        const signup = await prisma.signup.create({
          data: {
            volunteerId: manual.volunteerId,
            activitySlotId: manual.activitySlotId,
            withdrawn: false,
          },
          include: {
            activitySlot: {
              include: {
                activityType: true,
              },
            },
            volunteer: true,
          },
        });

        // Award points
        await prisma.pointEvent.create({
          data: {
            volunteerId: manual.volunteerId,
            points: signup.activitySlot.activityType.pointValue,
            eventType: PointEventType.EVENT_PARTICIPATION,
            referenceId: event.id,
            createdById: completedById,
            reason: `Event participation (manual): ${event.title} - ${signup.activitySlot.activityType.name}`,
            activityTypeId: signup.activitySlot.activityType.id,
          },
        });

        // Update point balance
        await this.updatePointBalance(manual.volunteerId, signup.activitySlot.activityType.pointValue);

        pointsAwarded.push({
          volunteerId: manual.volunteerId,
          volunteerName: signup.volunteer.name,
          points: signup.activitySlot.activityType.pointValue,
          activityType: signup.activitySlot.activityType.name,
        });
      }
    }

    // Mark event as complete
    await prisma.event.update({
      where: { id: eventId },
      data: { isComplete: true },
    });

    return {
      id: eventId,
      isComplete: true,
      pointsAwarded,
    };
  }

  /**
   * Update volunteer point balance
   * Creates record if it doesn't exist
   */
  private async updatePointBalance(volunteerId: string, points: number) {
    const existing = await prisma.volunteerPointBalance.findUnique({
      where: { volunteerId },
    });

    if (existing) {
      await prisma.volunteerPointBalance.update({
        where: { volunteerId },
        data: {
          totalPoints: existing.totalPoints + points,
          currentYearPoints: existing.currentYearPoints + points,
        },
      });
    } else {
      await prisma.volunteerPointBalance.create({
        data: {
          volunteerId,
          totalPoints: points,
          currentYearPoints: points,
        },
      });
    }

    // Update leaderboard cache
    await this.updateLeaderboardCache(volunteerId);
  }

  /**
   * Update leaderboard cache for a volunteer
   */
  private async updateLeaderboardCache(volunteerId: string) {
    const balance = await prisma.volunteerPointBalance.findUnique({
      where: { volunteerId },
    });

    if (!balance) return;

    const volunteer = await prisma.volunteer.findUnique({
      where: { id: volunteerId },
      select: { leaderboardOptIn: true },
    });

    if (!volunteer || !volunteer.leaderboardOptIn) {
      // Remove from leaderboard if opted out
      await prisma.leaderboardCache.deleteMany({
        where: { volunteerId },
      });
      return;
    }

    // Upsert leaderboard entry
    await prisma.leaderboardCache.upsert({
      where: { volunteerId },
      update: {
        totalPoints: balance.totalPoints,
      },
      create: {
        volunteerId,
        totalPoints: balance.totalPoints,
        badgeTier: null, // Will be calculated by BadgeTierService
      },
    });
  }

  /**
   * Get event by ID with all details
   */
  async getEventById(eventId: string, currentUserId?: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId, deletedAt: null },
      include: {
        activitySlots: {
          include: {
            activityType: {
              select: {
                id: true,
                name: true,
                pointValue: true,
                category: true,
              },
            },
            signups: {
              include: {
                volunteer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
            steps: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        targetDens: {
          include: {
            den: {
              select: {
                id: true,
                name: true,
                denNumber: true,
                rankLevel: true,
              },
            },
          },
        },
        plannedRequirements: {
          include: {
            requirement: {
              include: {
                adventure: {
                  select: {
                    id: true,
                    name: true,
                    rank: {
                      select: {
                        rankLevel: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!event) {
      return event;
    }

    return {
      ...event,
      derivedRankLevels: this.deriveRankLevels(event),
    };
  }

  /**
   * List events with filters and pagination
   */
  async listEvents(
    page: number,
    limit: number,
    filters: {
      scopeType?: 'ALL' | 'PACK_WIDE' | 'DEN';
      denIds?: string[];
      upcoming?: boolean;
      mySignups?: boolean;
    },
    currentUserId?: string,
  ) {
    const skip = (page - 1) * limit;

    const uniqueDenIds = [...new Set(filters.denIds ?? [])];
    const denRows = uniqueDenIds.length > 0
      ? await prisma.den.findMany({
          where: { id: { in: uniqueDenIds }, deletedAt: null, isActive: true },
          select: { id: true, rankLevel: true },
        })
      : [];

    const denRanks = [...new Set(denRows.map((den) => den.rankLevel))];
    const hasScopeContext =
      !!filters.scopeType ||
      uniqueDenIds.length > 0;

    const packWideCondition = {
      OR: [
        { scopeType: EventScope.PACK_WIDE },
        {
          AND: [
            { targetDens: { none: {} } },
            { rankLevel: null },
          ],
        },
      ],
    };

    const denConditionParts = [
      ...(uniqueDenIds.length > 0
        ? [{ targetDens: { some: { denId: { in: uniqueDenIds } } } }]
        : []),
      ...(denRanks.length > 0
        ? [{ targetDens: { some: { den: { rankLevel: { in: denRanks as any } } } } }]
        : []),
      ...(denRanks.length > 0
        ? [{ AND: [{ targetDens: { none: {} } }, { rankLevel: { in: denRanks } }] }]
        : []),
    ];

    const denCondition = denConditionParts.length > 0 ? { OR: denConditionParts } : null;

    // Build where clause
    const where: any = {
      deletedAt: null,
    };

    // Filter by upcoming events
    if (filters.upcoming) {
      where.eventDate = { gte: new Date() };
    }

    if (hasScopeContext) {
      const scopeType = filters.scopeType ?? 'ALL';
      const scopeCondition =
        scopeType === 'PACK_WIDE'
          ? packWideCondition
          : scopeType === 'DEN'
          ? denCondition ?? { id: { in: [] } }
          : {
              OR: [packWideCondition, ...(denCondition ? [denCondition] : [])],
            };

      where.AND = [
        { deletedAt: null },
        scopeCondition,
      ];
    }

    // Filter by user's signups
    if (filters.mySignups && currentUserId) {
      where.activitySlots = {
        some: {
          signups: {
            some: {
              volunteerId: currentUserId,
              withdrawn: false,
            },
          },
        },
      };
    }

    // Get total count
    const total = await prisma.event.count({ where });

    // Get events
    const events = await prisma.event.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        eventDate: 'asc',
      },
      include: {
        activitySlots: {
          include: {
            activityType: {
              select: {
                id: true,
                name: true,
                pointValue: true,
                category: true,
              },
            },
            signups: {
              where: { withdrawn: false },
              select: {
                id: true,
                volunteerId: true,
              },
            },
            steps: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        targetDens: {
          include: {
            den: {
              select: {
                id: true,
                name: true,
                denNumber: true,
                rankLevel: true,
              },
            },
          },
        },
        plannedRequirements: {
          include: {
            requirement: {
              include: {
                adventure: {
                  select: {
                    id: true,
                    name: true,
                    rank: {
                      select: {
                        rankLevel: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Add signup counts and current user signup info
    const eventsWithCounts = events.map(event => {
      const derivedRankLevels = this.deriveRankLevels(event);

      return {
      ...event,
      derivedRankLevels,
      activitySlots: event.activitySlots.map(slot => {
        const signedUpCount = slot.signups.length;
        const currentUserSignup = currentUserId
          ? slot.signups.find(s => s.volunteerId === currentUserId)
          : null;

        return {
          id: slot.id,
          activityType: slot.activityType,
          capacity: slot.capacity,
          description: slot.description,
          steps: slot.steps,
          signedUpCount,
          currentUserSignup: currentUserSignup
            ? { id: currentUserSignup.id, withdrawn: false }
            : null,
        };
      }),
    };
    });

    return {
      events: eventsWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Soft delete an event
   */
  async deleteEvent(eventId: string) {
    await prisma.event.update({
      where: { id: eventId },
      data: { deletedAt: new Date() },
    });
  }
}
