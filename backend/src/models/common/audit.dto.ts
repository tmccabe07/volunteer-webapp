/**
 * Common Audit Field DTOs
 * 
 * Provides Zod schemas for audit trail fields used across advancement tracking
 * per data-model.md audit patterns
 */

import { z } from 'zod';

/**
 * Base audit fields for tracked actions
 * 
 * Used for:
 * - Requirement completion tracking
 * - Award fulfillment actions
 * - Event attendance records
 */
export const AuditFieldsSchema = z.object({
  completedBy: z.string().cuid(),
  completedAt: z.coerce.date(),
  notes: z.string().max(1000).optional()
});

export type AuditFields = z.infer<typeof AuditFieldsSchema>;

/**
 * Extended audit fields with optional approval/verification
 * 
 * Used for:
 * - Requirement approval workflows
 * - Award state transitions
 */
export const ApprovalAuditFieldsSchema = AuditFieldsSchema.extend({
  approvedBy: z.string().cuid().optional(),
  approvedAt: z.coerce.date().optional(),
  approvalNotes: z.string().max(1000).optional()
});

export type ApprovalAuditFields = z.infer<typeof ApprovalAuditFieldsSchema>;

/**
 * Audit fields for state transitions
 * 
 * Used for:
 * - Award state machine transitions
 * - Requirement reconciliation status changes
 */
export const StateTransitionAuditSchema = z.object({
  fromState: z.string(),
  toState: z.string(),
  transitionedBy: z.string().cuid(),
  transitionedAt: z.coerce.date(),
  transitionReason: z.string().max(500).optional()
});

export type StateTransitionAudit = z.infer<typeof StateTransitionAuditSchema>;

/**
 * Batch operation audit fields
 * 
 * Used for:
 * - Bulk import operations
 * - Year rollover batches
 */
export const BatchOperationAuditSchema = z.object({
  batchId: z.string().cuid(),
  initiatedBy: z.string().cuid(),
  initiatedAt: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
  recordCount: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  failureCount: z.number().int().nonnegative(),
  errorSummary: z.string().optional()
});

export type BatchOperationAudit = z.infer<typeof BatchOperationAuditSchema>;

/**
 * Import source audit metadata
 * 
 * Used for:
 * - Scoutbook import tracking
 * - External system sync records
 */
export const ImportSourceAuditSchema = z.object({
  sourceSystem: z.enum(['SCOUTBOOK', 'MANUAL', 'ROLLOVER']),
  sourceId: z.string().optional(),
  importedBy: z.string().cuid(),
  importedAt: z.coerce.date(),
  sourceMetadata: z.record(z.string(), z.unknown()).optional()
});

export type ImportSourceAudit = z.infer<typeof ImportSourceAuditSchema>;
