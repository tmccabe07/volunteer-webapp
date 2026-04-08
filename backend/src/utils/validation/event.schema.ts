/**
 * Zod Validation Schemas for Event API
 * 
 * Validates event creation, updates, completion, and signup requests
 * per contracts/events-api.md
 */

import { z } from 'zod';
import { RankLevel } from '@prisma/client';

/**
 * Custom boolean coercion that handles string 'true'/'false'
 */
const booleanString = z
  .string()
  .transform(val => val === 'true')
  .or(z.boolean());

/**
 * Schema for creating a new event
 * POST /api/events
 */
export const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  eventDate: z.string().datetime(), // ISO 8601
  eventTime: z.string().optional(),
  location: z.string().optional(),
  rankLevel: z.nativeEnum(RankLevel).nullable().optional(), // null = PACK_WIDE
  isRecurring: z.boolean().optional().default(false),
  activitySlots: z.array(z.object({
    activityTypeId: z.string(),
    capacity: z.number().int().positive().nullable().optional(),
  })).min(1),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

/**
 * Schema for updating an event
 * PUT /api/events/:id
 * All fields optional
 */
export const updateEventSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  eventDate: z.string().datetime().optional(),
  eventTime: z.string().optional(),
  location: z.string().optional(),
  rankLevel: z.nativeEnum(RankLevel).optional().nullable(),
  isRecurring: z.boolean().optional(),
  activitySlots: z.array(z.object({
    activityTypeId: z.string(),
    capacity: z.number().int().positive().nullable().optional(),
  })).min(1).optional(),
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

/**
 * Schema for completing an event
 * POST /api/events/:id/complete
 */
export const completeEventSchema = z.object({
  manualVolunteers: z.array(z.object({
    volunteerId: z.string(),
    activitySlotId: z.string(),
  })).optional(),
});

export type CompleteEventInput = z.infer<typeof completeEventSchema>;

/**
 * Schema for listing events query parameters
 * GET /api/events
 */
export const listEventsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  rankLevel: z.nativeEnum(RankLevel).optional(),
  upcoming: booleanString.optional().default(true),
  mySignups: booleanString.optional().default(false),
});

export type ListEventsQuery = z.infer<typeof listEventsSchema>;
