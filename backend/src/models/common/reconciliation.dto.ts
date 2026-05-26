/**
 * Reconciliation Status DTOs
 * 
 * Provides Zod schemas for requirement completion reconciliation
 * per data-model.md optimistic locking patterns
 */

import { z } from 'zod';

/**
 * Reconciliation status for requirement progress records
 * 
 * Values:
 * - SYNCED: Local and Scoutbook in sync
 * - PENDING_EXPORT: Local changes need export to Scoutbook
 * - CONFLICT: Conflicting changes detected
 */
export const ReconciliationStatusEnum = z.enum(['SYNCED', 'PENDING_EXPORT', 'CONFLICT']);

export type ReconciliationStatus = z.infer<typeof ReconciliationStatusEnum>;

/**
 * Reconciliation metadata for tracking sync state
 */
export const ReconciliationMetadataSchema = z.object({
  status: ReconciliationStatusEnum,
  lastSyncedAt: z.coerce.date().optional(),
  scoutbookVersion: z.number().int().optional(),
  localVersion: z.number().int(),
  conflictReason: z.string().max(500).optional()
});

export type ReconciliationMetadata = z.infer<typeof ReconciliationMetadataSchema>;

/**
 * DTO for updating reconciliation status
 */
export const UpdateReconciliationStatusDto = z.object({
  status: ReconciliationStatusEnum,
  conflictReason: z.string().max(500).optional()
});

export type UpdateReconciliationStatusDto = z.infer<typeof UpdateReconciliationStatusDto>;

/**
 * DTO for reconciliation conflict resolution
 */
export const ResolveConflictDto = z.object({
  requirementProgressId: z.string().cuid(),
  resolution: z.enum(['USE_LOCAL', 'USE_REMOTE', 'MERGE']),
  mergedData: z.object({
    completed: z.boolean(),
    completedBy: z.string().cuid().optional(),
    completedAt: z.coerce.date().optional(),
    notes: z.string().max(1000).optional()
  }).optional(),
  resolvedBy: z.string().cuid()
});

export type ResolveConflictDto = z.infer<typeof ResolveConflictDto>;

/**
 * DTO for bulk reconciliation operations
 */
export const BulkReconciliationDto = z.object({
  childId: z.string().cuid(),
  adventureId: z.string().cuid().optional(),
  action: z.enum(['SYNC_TO_SCOUTBOOK', 'PULL_FROM_SCOUTBOOK', 'RESOLVE_ALL_CONFLICTS']),
  autoResolveStrategy: z.enum(['PREFER_LOCAL', 'PREFER_REMOTE']).optional(),
  initiatedBy: z.string().cuid()
});

export type BulkReconciliationDto = z.infer<typeof BulkReconciliationDto>;

/**
 * Response DTO for reconciliation status query
 */
export const ReconciliationStatusResponseDto = z.object({
  childId: z.string().cuid(),
  syncedCount: z.number().int().nonnegative(),
  pendingExportCount: z.number().int().nonnegative(),
  conflictCount: z.number().int().nonnegative(),
  lastSyncedAt: z.coerce.date().optional(),
  conflicts: z.array(z.object({
    requirementProgressId: z.string().cuid(),
    requirementName: z.string(),
    adventureName: z.string(),
    localVersion: z.number().int(),
    scoutbookVersion: z.number().int().optional(),
    conflictReason: z.string()
  }))
});

export type ReconciliationStatusResponse = z.infer<typeof ReconciliationStatusResponseDto>;
