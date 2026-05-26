import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AttendanceStatus, CompletionType, CoverageSource, ReconciliationStatus } from '@prisma/client';
import prisma from '../../utils/prisma';
import type {
  RecordAttendanceDto,
  AttendanceRecord,
} from '../../models/attendance/record-attendance.dto';

/**
 * ChildAttendanceService handles child attendance and requirement tracking
 * per contracts/api-endpoints.md
 * 
 * Implements:
 * - Recording attendance for multiple children at events
 * - Tracking covered requirements (many-to-many relationship)
 * - Updating existing attendance records
 * - Querying attendance by event
 */
@Injectable()
export class ChildAttendanceService {
  /**
   * ChildAttendance currently references DenEvent in Prisma schema.
   * Attendance endpoints are event-id based, so ensure a matching DenEvent
   * exists (same id) before writing attendance rows.
   */
  private async ensureAttendanceEvent(eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId, deletedAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        eventDate: true,
        eventTime: true,
        endTime: true,
        fullDay: true,
        location: true,
        createdById: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const denEvent = await prisma.denEvent.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!denEvent) {
      await prisma.denEvent.create({
        data: {
          id: event.id,
          title: event.title,
          description: event.description,
          eventDate: event.eventDate,
          eventTime: event.eventTime,
          endTime: event.endTime,
          fullDay: event.fullDay,
          location: event.location,
          denId: null,
          createdById: event.createdById,
        },
      });
    }

    return event;
  }

  /**
   * Record or update child attendance for an event
   * T069: Many-to-many relationship with covered requirements
   */
  async recordAttendance(
    eventId: string,
    dto: RecordAttendanceDto,
    recordedByUserId: string,
  ) {
    // Verify event exists and ensure FK-compatible attendance event exists.
    await this.ensureAttendanceEvent(eventId);

    // Validate all child scouts exist
    const childIds = dto.attendance.map(a => a.childScoutId);
    const uniqueChildIds = [...new Set(childIds)];
    const children = await prisma.childScout.findMany({
      where: { id: { in: uniqueChildIds }, deletedAt: null },
      select: { id: true },
    });

    if (children.length !== uniqueChildIds.length) {
      const foundIds = children.map(c => c.id);
      const missing = uniqueChildIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(`Child scouts not found: ${missing.join(', ')}`);
    }

    // Requirements can only be recorded for PRESENT attendees.
    for (const record of dto.attendance) {
      if (
        record.attendanceStatus !== AttendanceStatus.PRESENT &&
        (record.coveredRequirementIds || []).length > 0
      ) {
        throw new BadRequestException(
          `Covered requirements can only be recorded for PRESENT attendees (child ${record.childScoutId})`,
        );
      }
    }

    // Validate all requirement IDs exist
    const allRequirementIds = dto.attendance.flatMap(
      a => a.coveredRequirementIds || [],
    );
    const uniqueRequirementIds = [...new Set(allRequirementIds)];
    
    if (uniqueRequirementIds.length > 0) {
      const requirements = await prisma.requirement.findMany({
        where: { id: { in: uniqueRequirementIds } },
        select: { id: true, adventureId: true },
      });

      if (requirements.length !== uniqueRequirementIds.length) {
        const foundIds = requirements.map(r => r.id);
        const missing = uniqueRequirementIds.filter(id => !foundIds.includes(id));
        throw new BadRequestException(`Invalid requirement IDs: ${missing.join(', ')}`);
      }

      const requirementMap = new Map(requirements.map((r) => [r.id, r]));

      // Build requirement progress and occurrence records from PRESENT attendance only.
      for (const record of dto.attendance) {
        if (record.attendanceStatus !== AttendanceStatus.PRESENT) {
          continue;
        }

        for (const requirementId of record.coveredRequirementIds || []) {
          const requirement = requirementMap.get(requirementId);
          if (!requirement) {
            continue;
          }

          try {
            await prisma.requirementProgress.create({
              data: {
                childScoutId: record.childScoutId,
                requirementId,
                adventureId: requirement.adventureId,
                completedBy: recordedByUserId,
                completionType: CompletionType.MEETING,
                notes: record.notes,
                scoutbookStatus: ReconciliationStatus.PENDING,
              },
            });
          } catch (error: any) {
            // Requirement already completed once; keep historical occurrence only.
            if (error?.code !== 'P2002') {
              throw error;
            }
          }

          await prisma.requirementCoverageOccurrence.create({
            data: {
              childScoutId: record.childScoutId,
              requirementId,
              adventureId: requirement.adventureId,
              eventId,
              completionType: CompletionType.MEETING,
              notes: record.notes,
              recordedBy: recordedByUserId,
              source: CoverageSource.MEETING_ATTENDANCE,
            },
          });
        }
      }
    }

    // Process each attendance record
    const results: any[] = [];

    for (const record of dto.attendance) {
      // Check if attendance record already exists
      const existing = await prisma.childAttendance.findFirst({
        where: {
          eventId,
          childScoutId: record.childScoutId,
        },
      });

      if (existing) {
        // Update existing record
        const updated = await prisma.childAttendance.update({
          where: { id: existing.id },
          data: {
            attendanceStatus: record.attendanceStatus,
            notes: record.notes,
            recordedAt: new Date(),
            recordedBy: recordedByUserId,
            // Update covered requirements via implicit many-to-many
            coveredRequirements: {
              set: [], // Clear existing
              connect: (record.coveredRequirementIds || []).map(id => ({ id })),
            },
          },
          include: {
            coveredRequirements: {
              select: {
                id: true,
                requirementText: true,
              },
            },
          },
        });

        results.push({
          childScoutId: updated.childScoutId,
          attendanceStatus: updated.attendanceStatus,
          coveredRequirements: updated.coveredRequirements,
        });
      } else {
        // Create new record
        const created = await prisma.childAttendance.create({
          data: {
            eventId,
            childScoutId: record.childScoutId,
            attendanceStatus: record.attendanceStatus,
            notes: record.notes,
            recordedAt: new Date(),
            recordedBy: recordedByUserId,
            // Connect covered requirements via implicit many-to-many
            coveredRequirements: {
              connect: (record.coveredRequirementIds || []).map(id => ({ id })),
            },
          },
          include: {
            coveredRequirements: {
              select: {
                id: true,
                requirementText: true,
              },
            },
          },
        });

        results.push({
          childScoutId: created.childScoutId,
          attendanceStatus: created.attendanceStatus,
          coveredRequirements: created.coveredRequirements || [],
        });
      }
    }

    return {
      recorded: results.length,
      attendance: results,
    };
  }

  /**
   * Get child attendance records for an event
   */
  async getAttendanceByEvent(eventId: string, statusFilter?: AttendanceStatus) {
    const event = await this.ensureAttendanceEvent(eventId);

    const whereClause: any = { eventId };
    if (statusFilter) {
      whereClause.attendanceStatus = statusFilter;
    }

    const attendanceRecords = await prisma.childAttendance.findMany({
      where: whereClause,
      include: {
        childScout: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        coveredRequirements: {
          include: {
            adventure: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { childScout: { lastName: 'asc' } },
        { childScout: { firstName: 'asc' } },
      ],
    });

    return {
      event: {
        id: event.id,
        title: event.title,
        eventDate: event.eventDate.toISOString(),
      },
      attendance: attendanceRecords.map(record => ({
        child: {
          id: record.childScout.id,
          firstName: record.childScout.firstName,
          lastName: record.childScout.lastName,
        },
        attendanceStatus: record.attendanceStatus,
        notes: record.notes,
        coveredRequirements: record.coveredRequirements.map(req => ({
          id: req.id,
          adventureName: req.adventure.name,
          requirementText: req.requirementText,
        })),
        recordedAt: record.recordedAt!.toISOString(),
        recordedBy: record.recordedBy!,
      })),
    };
  }

  /**
   * Get attendance for a specific child at an event
   */
  async getChildAttendanceAtEvent(eventId: string, childScoutId: string) {
    const attendance = await prisma.childAttendance.findFirst({
      where: {
        eventId,
        childScoutId: childScoutId,
      },
      include: {
        coveredRequirements: {
          include: {
            adventure: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    return {
      attendanceStatus: attendance.attendanceStatus,
      notes: attendance.notes,
      coveredRequirements: attendance.coveredRequirements.map(req => ({
        id: req.id,
        adventureName: req.adventure.name,
        requirementText: req.requirementText,
      })),
      recordedAt: attendance.recordedAt!.toISOString(),
      recordedBy: attendance.recordedBy!,
    };
  }
}
