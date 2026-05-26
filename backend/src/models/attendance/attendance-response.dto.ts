import { z } from 'zod';
import { AttendanceStatus, RankLevel } from '@prisma/client';

/**
 * Response DTOs for child attendance endpoints
 */

/**
 * Summary of attendance recording
 * Response for PATCH /events/:id/child-attendance
 */
export const RecordAttendanceResponseSchema = z.object({
  recorded: z.number(),
  attendance: z.array(
    z.object({
      childScoutId: z.string(),
      attendanceStatus: z.nativeEnum(AttendanceStatus),
      coveredRequirements: z.array(
        z.object({
          id: z.string(),
          requirementText: z.string(),
        }),
      ),
    }),
  ),
});

export type RecordAttendanceResponse = z.infer<typeof RecordAttendanceResponseSchema>;

/**
 * Child attendance detail
 */
export const ChildAttendanceDetailSchema = z.object({
  child: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
  attendanceStatus: z.nativeEnum(AttendanceStatus),
  notes: z.string().nullable().optional(),
  coveredRequirements: z.array(
    z.object({
      id: z.string(),
      adventureName: z.string(),
      requirementText: z.string(),
    }),
  ),
  recordedAt: z.string(),
  recordedBy: z.string(),
});

export type ChildAttendanceDetail = z.infer<typeof ChildAttendanceDetailSchema>;

/**
 * Response for GET /events/:id/child-attendance
 */
export const GetAttendanceResponseSchema = z.object({
  event: z.object({
    id: z.string(),
    title: z.string(),
    eventDate: z.string(),
  }),
  attendance: z.array(ChildAttendanceDetailSchema),
});

export type GetAttendanceResponse = z.infer<typeof GetAttendanceResponseSchema>;
