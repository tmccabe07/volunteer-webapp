# Bulk Operations Research - NestJS + Prisma + TypeScript

## Topic 1: Bulk CSV Import Patterns

### Overview
Best practices for implementing Scoutbook roster CSV import with comprehensive error handling, partial success support, and audit trail tracking.

### Technology Recommendations

#### CSV Parsing Library: `csv-parse`
**Recommended:** `csv-parse` from the `csv` package family
- **Pros:**
  - Streaming support for large files (100+ rows)
  - Built-in error handling per row
  - TypeScript support
  - Low memory footprint
  - Native Node.js streams integration
  - Well-maintained and battle-tested
- **Installation:** `npm install csv-parse`
- **Alternative:** `papaparse` (good for browser + Node.js, slightly heavier)

#### File Upload: NestJS Built-in + Multer
- Use `@nestjs/platform-express` (already in dependencies)
- File size limits to prevent abuse
- Memory storage for processing, disk storage for large files
- MIME type validation

### Prisma Schema Extensions

```prisma
// Add to schema.prisma

// ============================================================================
// Bulk Import Management
// ============================================================================

model ImportBatch {
  id              String        @id @default(cuid())
  batchType       ImportType
  fileName        String
  fileSize        Int           // bytes
  totalRows       Int           // rows in CSV (excluding header)
  processedRows   Int           @default(0)
  successRows     Int           @default(0)
  failedRows      Int           @default(0)
  status          BatchStatus   @default(PENDING)
  startedAt       DateTime?
  completedAt     DateTime?
  uploadedById    String
  uploadedBy      Volunteer     @relation(fields: [uploadedById], references: [id])
  
  errors          ImportError[]
  children        Child[]       // Children created/updated in this batch
  
  createdAt       DateTime      @default(now())
  
  @@index([uploadedById, createdAt])
  @@index([status])
  @@index([batchType, createdAt])
}

enum ImportType {
  SCOUTBOOK_ROSTER
  VOLUNTEER_ROSTER
  EVENT_SIGNUPS
}

enum BatchStatus {
  PENDING       // Uploaded, not yet processed
  PROCESSING    // Currently processing
  COMPLETED     // All rows processed (may have failures)
  FAILED        // Critical error, processing stopped
  CANCELLED     // Manually cancelled by admin
}

model ImportError {
  id              String        @id @default(cuid())
  batchId         String
  batch           ImportBatch   @relation(fields: [batchId], references: [id], onDelete: Cascade)
  rowNumber       Int           // 1-based row number in CSV
  errorType       ErrorType
  errorMessage    String
  fieldName       String?       // Which field caused the error
  rawRowData      Json          // Store the problematic row data
  
  createdAt       DateTime      @default(now())
  
  @@index([batchId, rowNumber])
  @@index([batchId, errorType])
}

enum ErrorType {
  VALIDATION_ERROR    // Invalid data format
  DUPLICATE_EMAIL     // Email already exists
  MISSING_REQUIRED    // Required field missing
  INVALID_RANK        // Invalid rank value
  INVALID_DEN         // Invalid den assignment
  DATABASE_ERROR      // DB constraint violation
  PARSING_ERROR       // CSV parsing failed
}

// ============================================================================
// Child Records (Scouts)
// ============================================================================

model Child {
  id              String        @id @default(cuid())
  firstName       String
  lastName        String
  dateOfBirth     DateTime?
  currentRank     RankLevel?
  denAssignment   String?       // e.g., "Den 1", "Den 2"
  
  // Parent relationships
  parents         ChildToParent[]
  
  // Import tracking
  importBatchId   String?
  importBatch     ImportBatch?  @relation(fields: [importBatchId], references: [id], onDelete: SetNull)
  
  // Advancement tracking
  advancements    Advancement[]
  adventureProgress AdventureProgress[]
  
  isActive        Boolean       @default(true)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?     // Soft delete
  
  @@index([currentRank, isActive])
  @@index([importBatchId])
  @@index([deletedAt])
}

model ChildToParent {
  id              String        @id @default(cuid())
  childId         String
  child           Child         @relation(fields: [childId], references: [id], onDelete: Cascade)
  parentId        String
  parent          Volunteer     @relation(fields: [parentId], references: [id], onDelete: Cascade)
  relationship    String?       // "Mother", "Father", "Guardian", etc.
  
  createdAt       DateTime      @default(now())
  
  @@unique([childId, parentId])
  @@index([childId])
  @@index([parentId])
}

// ============================================================================
// Advancement History (for annual rollover)
// ============================================================================

model Advancement {
  id              String        @id @default(cuid())
  childId         String
  child           Child         @relation(fields: [childId], references: [id], onDelete: Cascade)
  
  rankLevel       RankLevel
  startDate       DateTime
  completionDate  DateTime?
  isActive        Boolean       @default(true) // Current rank
  
  // Rollover tracking
  rolloverBatchId String?
  notes           String?       // e.g., "Rolled over from Tiger", "Graduated AOL"
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@index([childId, isActive])
  @@index([childId, rankLevel])
  @@index([rolloverBatchId])
}

model AdventureProgress {
  id              String        @id @default(cuid())
  childId         String
  child           Child         @relation(fields: [childId], references: [id], onDelete: Cascade)
  
  adventureName   String        // e.g., "Backyard Jungle", "Howling at the Moon"
  rankLevel       RankLevel
  isCompleted     Boolean       @default(false)
  completedDate   DateTime?
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@unique([childId, adventureName, rankLevel])
  @@index([childId, rankLevel, isCompleted])
}
```

### Service Implementation

#### Import Service Structure

```typescript
// src/services/import.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import prisma from '../utils/prisma';
import type { ImportBatch, ImportError, BatchStatus } from '@prisma/client';

interface ScoutbookRow {
  FirstName: string;
  LastName: string;
  DOB: string;
  Rank: string;
  Den: string;
  Parent1Email?: string;
  Parent2Email?: string;
  Parent1Name?: string;
  Parent2Name?: string;
  // Add other Scoutbook fields
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    type: ErrorType;
  }>;
  normalizedData?: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date | null;
    currentRank: RankLevel | null;
    denAssignment: string | null;
    parentEmails: string[];
  };
}

interface ImportSummary {
  batchId: string;
  fileName: string;
  status: BatchStatus;
  totalRows: number;
  successRows: number;
  failedRows: number;
  duration: number; // milliseconds
  errors: Array<{
    rowNumber: number;
    errorType: string;
    message: string;
    fieldName?: string;
  }>;
}

@Injectable()
export class ImportService {
  /**
   * Process CSV import with streaming for large files
   * 
   * @param file - Uploaded file buffer
   * @param fileName - Original file name
   * @param uploadedById - User ID uploading the file
   * @returns Import summary with results
   */
  async importScoutbookRoster(
    file: Buffer,
    fileName: string,
    uploadedById: string
  ): Promise<ImportSummary> {
    const startTime = Date.now();
    
    // Create import batch record
    const batch = await prisma.importBatch.create({
      data: {
        batchType: 'SCOUTBOOK_ROSTER',
        fileName,
        fileSize: file.length,
        totalRows: 0, // Will update after counting
        uploadedById,
        status: 'PENDING',
      },
    });

    try {
      // Update status to processing
      await prisma.importBatch.update({
        where: { id: batch.id },
        data: { 
          status: 'PROCESSING',
          startedAt: new Date(),
        },
      });

      // Parse and process CSV
      const rows = await this.parseCSV(file);
      
      // Update total row count
      await prisma.importBatch.update({
        where: { id: batch.id },
        data: { totalRows: rows.length },
      });

      // Process rows in batches to avoid memory issues
      const BATCH_SIZE = 50;
      let successCount = 0;
      let failureCount = 0;
      const errors: ImportError[] = [];

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const rowBatch = rows.slice(i, i + BATCH_SIZE);
        const results = await this.processRowBatch(
          rowBatch,
          batch.id,
          i + 1, // Starting row number (1-based)
        );
        
        successCount += results.successCount;
        failureCount += results.failureCount;
        errors.push(...results.errors);

        // Update progress
        await prisma.importBatch.update({
          where: { id: batch.id },
          data: {
            processedRows: i + rowBatch.length,
            successRows: successCount,
            failedRows: failureCount,
          },
        });
      }

      // Mark batch complete
      await prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: uploadedById,
          action: 'IMPORT_SCOUTBOOK_ROSTER',
          entityType: 'ImportBatch',
          entityId: batch.id,
          changes: {
            fileName,
            totalRows: rows.length,
            successRows: successCount,
            failedRows: failureCount,
          },
        },
      });

      return {
        batchId: batch.id,
        fileName,
        status: 'COMPLETED',
        totalRows: rows.length,
        successRows: successCount,
        failedRows: failureCount,
        duration: Date.now() - startTime,
        errors: errors.map(e => ({
          rowNumber: e.rowNumber,
          errorType: e.errorType,
          message: e.errorMessage,
          fieldName: e.fieldName,
        })),
      };

    } catch (error) {
      // Mark batch as failed
      await prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
        },
      });

      throw new BadRequestException(
        `Import failed: ${error.message}`
      );
    }
  }

  /**
   * Parse CSV file into array of rows
   * Uses streaming for memory efficiency
   */
  private async parseCSV(file: Buffer): Promise<ScoutbookRow[]> {
    return new Promise((resolve, reject) => {
      const rows: ScoutbookRow[] = [];
      const stream = Readable.from(file);

      stream
        .pipe(parse({
          columns: true, // Use first row as column names
          skip_empty_lines: true,
          trim: true,
          bom: true, // Handle UTF-8 BOM
        }))
        .on('data', (row: ScoutbookRow) => {
          rows.push(row);
        })
        .on('error', (error) => {
          reject(new BadRequestException(
            `CSV parsing error: ${error.message}`
          ));
        })
        .on('end', () => {
          resolve(rows);
        });
    });
  }

  /**
   * Process a batch of rows with transaction support
   * Ensures partial success - individual row failures don't roll back successes
   */
  private async processRowBatch(
    rows: ScoutbookRow[],
    batchId: string,
    startingRowNumber: number
  ): Promise<{
    successCount: number;
    failureCount: number;
    errors: ImportError[];
  }> {
    let successCount = 0;
    let failureCount = 0;
    const errors: ImportError[] = [];

    // Process each row independently for partial success
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = startingRowNumber + i;

      try {
        // Validate row
        const validation = this.validateRow(row, rowNumber);

        if (!validation.isValid) {
          // Store validation errors
          for (const error of validation.errors) {
            await prisma.importError.create({
              data: {
                batchId,
                rowNumber,
                errorType: error.type,
                errorMessage: error.message,
                fieldName: error.field,
                rawRowData: row,
              },
            });
            errors.push({
              rowNumber,
              errorType: error.type,
              errorMessage: error.message,
              fieldName: error.field,
            } as ImportError);
          }
          failureCount++;
          continue;
        }

        // Create/update child record in transaction
        await this.createOrUpdateChild(
          validation.normalizedData!,
          batchId,
          rowNumber
        );

        successCount++;

      } catch (error) {
        // Handle unexpected errors
        await prisma.importError.create({
          data: {
            batchId,
            rowNumber,
            errorType: 'DATABASE_ERROR',
            errorMessage: error.message,
            rawRowData: row,
          },
        });
        errors.push({
          rowNumber,
          errorType: 'DATABASE_ERROR',
          errorMessage: error.message,
        } as ImportError);
        failureCount++;
      }
    }

    return { successCount, failureCount, errors };
  }

  /**
   * Validate individual row data
   * Returns structured validation result
   */
  private validateRow(
    row: ScoutbookRow,
    rowNumber: number
  ): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    // Required field validation
    if (!row.FirstName || row.FirstName.trim() === '') {
      errors.push({
        field: 'FirstName',
        message: 'First name is required',
        type: 'MISSING_REQUIRED',
      });
    }

    if (!row.LastName || row.LastName.trim() === '') {
      errors.push({
        field: 'LastName',
        message: 'Last name is required',
        type: 'MISSING_REQUIRED',
      });
    }

    // Date of birth validation
    let dateOfBirth: Date | null = null;
    if (row.DOB) {
      dateOfBirth = new Date(row.DOB);
      if (isNaN(dateOfBirth.getTime())) {
        errors.push({
          field: 'DOB',
          message: `Invalid date format: ${row.DOB}`,
          type: 'VALIDATION_ERROR',
        });
        dateOfBirth = null;
      }
    }

    // Rank validation
    let currentRank: RankLevel | null = null;
    if (row.Rank) {
      const rankUpper = row.Rank.toUpperCase();
      const validRanks = ['LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL'];
      
      if (validRanks.includes(rankUpper)) {
        currentRank = rankUpper as RankLevel;
      } else {
        errors.push({
          field: 'Rank',
          message: `Invalid rank: ${row.Rank}. Must be one of: ${validRanks.join(', ')}`,
          type: 'INVALID_RANK',
        });
      }
    }

    // Email validation
    const parentEmails: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (row.Parent1Email) {
      if (emailRegex.test(row.Parent1Email)) {
        parentEmails.push(row.Parent1Email.toLowerCase());
      } else {
        errors.push({
          field: 'Parent1Email',
          message: `Invalid email format: ${row.Parent1Email}`,
          type: 'VALIDATION_ERROR',
        });
      }
    }

    if (row.Parent2Email) {
      if (emailRegex.test(row.Parent2Email)) {
        parentEmails.push(row.Parent2Email.toLowerCase());
      } else {
        errors.push({
          field: 'Parent2Email',
          message: `Invalid email format: ${row.Parent2Email}`,
          type: 'VALIDATION_ERROR',
        });
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      errors: [],
      normalizedData: {
        firstName: row.FirstName.trim(),
        lastName: row.LastName.trim(),
        dateOfBirth,
        currentRank,
        denAssignment: row.Den?.trim() || null,
        parentEmails,
      },
    };
  }

  /**
   * Create or update child record with parent relationships
   * Idempotent: re-running same import updates existing records
   */
  private async createOrUpdateChild(
    data: ValidationResult['normalizedData'],
    batchId: string,
    rowNumber: number
  ): Promise<void> {
    if (!data) return;

    await prisma.$transaction(async (tx) => {
      // Check for existing child by name and DOB
      const existingChild = await tx.child.findFirst({
        where: {
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth,
          deletedAt: null,
        },
      });

      let childId: string;

      if (existingChild) {
        // Update existing child
        const updated = await tx.child.update({
          where: { id: existingChild.id },
          data: {
            currentRank: data.currentRank,
            denAssignment: data.denAssignment,
            importBatchId: batchId,
            updatedAt: new Date(),
          },
        });
        childId = updated.id;
      } else {
        // Create new child
        const created = await tx.child.create({
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            dateOfBirth: data.dateOfBirth,
            currentRank: data.currentRank,
            denAssignment: data.denAssignment,
            importBatchId: batchId,
          },
        });
        childId = created.id;

        // Create initial advancement record if rank is set
        if (data.currentRank) {
          await tx.advancement.create({
            data: {
              childId,
              rankLevel: data.currentRank,
              startDate: new Date(),
              isActive: true,
            },
          });
        }
      }

      // Link to parent volunteers (if emails match existing volunteers)
      for (const email of data.parentEmails) {
        const parent = await tx.volunteer.findUnique({
          where: { email },
        });

        if (parent) {
          // Create parent-child relationship if not exists
          await tx.childToParent.upsert({
            where: {
              childId_parentId: {
                childId,
                parentId: parent.id,
              },
            },
            create: {
              childId,
              parentId: parent.id,
            },
            update: {}, // No update needed if exists
          });
        }
      }
    });
  }

  /**
   * Get import batch details with errors
   */
  async getImportBatch(batchId: string): Promise<ImportBatch & {
    errors: ImportError[];
  }> {
    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
      include: {
        errors: {
          orderBy: { rowNumber: 'asc' },
        },
        uploadedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Import batch not found');
    }

    return batch;
  }

  /**
   * Get import history for admin dashboard
   */
  async getImportHistory(
    limit: number = 50
  ): Promise<ImportBatch[]> {
    return await prisma.importBatch.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            errors: true,
            children: true,
          },
        },
      },
    });
  }
}
```

#### Controller Implementation

```typescript
// src/api/import.controller.ts

import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from '../services/import.service';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { TierGuard } from '../middleware/tier.guard';
import { RequireTier } from '../middleware/tier.decorator';
import { GetUser } from '../middleware/get-user.decorator';
import type { JWTPayload } from '../middleware/jwt-auth.middleware';

@Controller('api/imports')
@UseGuards(JwtAuthGuard, TierGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /**
   * Upload and process Scoutbook roster CSV
   * POST /api/imports/scoutbook-roster
   */
  @Post('scoutbook-roster')
  @RequireTier('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  async uploadScoutbookRoster(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: 'text/csv' }),
        ],
      })
    )
    file: Express.Multer.File,
    @GetUser() user: JWTPayload
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const summary = await this.importService.importScoutbookRoster(
      file.buffer,
      file.originalname,
      user.userId
    );

    return {
      success: true,
      data: summary,
    };
  }

  /**
   * Get import batch details
   * GET /api/imports/:batchId
   */
  @Get(':batchId')
  @RequireTier('ADMIN')
  async getImportBatch(@Param('batchId') batchId: string) {
    const batch = await this.importService.getImportBatch(batchId);
    
    return {
      success: true,
      data: batch,
    };
  }

  /**
   * Get import history
   * GET /api/imports
   */
  @Get()
  @RequireTier('ADMIN')
  async getImportHistory() {
    const history = await this.importService.getImportHistory();
    
    return {
      success: true,
      data: history,
    };
  }
}
```

### Best Practices Summary

#### ✅ DO:
1. **Stream large files** - Use `csv-parse` streaming to avoid loading entire file in memory
2. **Process in batches** - Process rows in chunks (50-100) to balance performance and memory
3. **Support partial success** - Don't roll back entire import if some rows fail
4. **Track every error** - Store row-level errors with context for debugging
5. **Make imports idempotent** - Re-running same file should update, not duplicate
6. **Validate thoroughly** - Check required fields, formats, and business rules before DB writes
7. **Use transactions per row** - Each row in its own transaction for isolation
8. **Provide detailed summaries** - Return counts and error details for user feedback
9. **Audit everything** - Log imports in AuditLog table
10. **Set file size limits** - Prevent abuse with reasonable maximums (5MB)

#### ❌ DON'T:
1. **Don't load entire file in memory** - Use streaming for large files
2. **Don't use single transaction for all rows** - One failure would roll back everything
3. **Don't ignore validation errors** - Store them for user to fix and re-import
4. **Don't allow duplicate imports** - Check for existing records by unique keys
5. **Don't block the request thread** - For very large imports, consider background jobs
6. **Don't trust CSV data** - Always validate and sanitize
7. **Don't lose error context** - Store raw row data with errors for debugging

#### Error Handling Strategy:
- **Validation errors** → Store error, skip row, continue processing
- **Database errors** → Store error, skip row, continue processing
- **Critical errors** (file corrupt, out of memory) → Stop processing, mark batch FAILED
- **Network errors** → Retry logic if using external APIs

#### Progress Reporting:
- Update `ImportBatch.processedRows` after each batch
- Frontend can poll `/api/imports/:batchId` for progress
- For long-running imports (1000+ rows), consider WebSocket or Server-Sent Events

---

## Topic 2: Annual Rank Rollover

### Overview
Best practices for bulk annual rank advancement with historical data preservation, atomic operations, and rollback capability.

### Rollover Requirements Analysis

#### Rank Progression Rules:
- LION → TIGER
- TIGER → WOLF
- WOLF → BEAR
- BEAR → WEBELOS
- WEBELOS → AOL
- AOL → **GRADUATED** (marked inactive)

#### Historical Preservation:
- Previous rank advancement records remain in `Advancement` table
- Adventure progress from previous ranks stays incomplete (not auto-awarded)
- Point history preserved in `PointEvent` table
- New rank starts with zero adventure completions

#### Edge Cases:
- **Transfers mid-year** - Don't roll over if joined after cutoff date
- **Inactive members** - Skip rollover for `isActive = false`
- **AOL graduates** - Mark inactive, create graduation record
- **Missing rank** - Handle children without current rank assignment
- **Den reassignments** - Optional den updates during rollover

### Prisma Schema Extensions

```prisma
// Add to schema.prisma

// ============================================================================
// Annual Rollover Management
// ============================================================================

model RolloverBatch {
  id              String        @id @default(cuid())
  scoutingYear    String        // e.g., "2025-2026"
  fromDate        DateTime      // Previous year end date
  toDate          DateTime      // New year start date
  
  totalChildren   Int           // Total children processed
  advancedCount   Int           @default(0) // Successfully advanced
  graduatedCount  Int           @default(0) // AOL graduates
  skippedCount    Int           @default(0) // Inactive or ineligible
  errorCount      Int           @default(0) // Failed advancements
  
  status          RolloverStatus @default(PENDING)
  startedAt       DateTime?
  completedAt     DateTime?
  executedById    String
  executedBy      Volunteer     @relation(fields: [executedById], references: [id])
  
  // Rollback support
  canRollback     Boolean       @default(true)
  rolledBackAt    DateTime?
  rollbackById    String?
  
  advancements    Advancement[] // Advancements created in this rollover
  errors          RolloverError[]
  
  createdAt       DateTime      @default(now())
  
  @@index([scoutingYear])
  @@index([status])
  @@index([executedById])
}

enum RolloverStatus {
  PENDING       // Created, not yet executed
  RUNNING       // Currently processing
  COMPLETED     // Successfully completed
  FAILED        // Critical error occurred
  ROLLED_BACK   // Rolled back after completion
}

model RolloverError {
  id              String        @id @default(cuid())
  batchId         String
  batch           RolloverBatch @relation(fields: [batchId], references: [id], onDelete: Cascade)
  childId         String
  childName       String        // Store name for reporting
  currentRank     String?
  errorType       RolloverErrorType
  errorMessage    String
  
  createdAt       DateTime      @default(now())
  
  @@index([batchId])
}

enum RolloverErrorType {
  NO_CURRENT_RANK     // Child has no rank assigned
  ALREADY_ADVANCED    // Child already has advancement for new year
  INACTIVE_CHILD      // Child marked inactive
  DATABASE_ERROR      // DB operation failed
  INVALID_RANK        // Rank value not recognized
}

// Update Advancement model with rollover tracking
// (fields already shown in previous schema)
```

### Service Implementation

```typescript
// src/services/rollover.service.ts

import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import prisma from '../utils/prisma';
import type { RankLevel, RolloverBatch } from '@prisma/client';

interface RolloverOptions {
  scoutingYear: string;
  fromDate: Date;
  toDate: Date;
  denReassignments?: Record<string, string>; // childId -> new den
  skipInactive?: boolean; // default true
  dryRun?: boolean; // preview without committing
}

interface RolloverSummary {
  batchId: string;
  scoutingYear: string;
  totalChildren: number;
  advancedCount: number;
  graduatedCount: number;
  skippedCount: number;
  errorCount: number;
  duration: number;
  errors: Array<{
    childId: string;
    childName: string;
    currentRank: string;
    errorType: string;
    errorMessage: string;
  }>;
}

@Injectable()
export class RolloverService {
  // Rank progression map
  private readonly RANK_PROGRESSION: Record<RankLevel, RankLevel | null> = {
    LION: 'TIGER',
    TIGER: 'WOLF',
    WOLF: 'BEAR',
    BEAR: 'WEBELOS',
    WEBELOS: 'AOL',
    AOL: null, // Graduates
    PACK_WIDE: 'PACK_WIDE', // Not a real rank, no advancement
  };

  /**
   * Execute annual rank rollover for all active children
   * 
   * @param options - Rollover configuration
   * @param executedById - Admin user executing rollover
   * @returns Rollover summary
   */
  async executeAnnualRollover(
    options: RolloverOptions,
    executedById: string
  ): Promise<RolloverSummary> {
    const startTime = Date.now();

    // Validate inputs
    this.validateRolloverOptions(options);

    // Check for existing rollover for this year
    const existingRollover = await prisma.rolloverBatch.findFirst({
      where: {
        scoutingYear: options.scoutingYear,
        status: { in: ['COMPLETED', 'RUNNING'] },
      },
    });

    if (existingRollover && !options.dryRun) {
      throw new ConflictException(
        `Rollover for ${options.scoutingYear} already exists. ` +
        `Use rollback first if you need to re-run.`
      );
    }

    // Create rollover batch
    const batch = await prisma.rolloverBatch.create({
      data: {
        scoutingYear: options.scoutingYear,
        fromDate: options.fromDate,
        toDate: options.toDate,
        totalChildren: 0,
        executedById,
        status: 'PENDING',
      },
    });

    try {
      // Update status to running
      await prisma.rolloverBatch.update({
        where: { id: batch.id },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      // Get all active children with current ranks
      const children = await prisma.child.findMany({
        where: {
          isActive: true,
          deletedAt: null,
        },
        include: {
          advancements: {
            where: { isActive: true },
            orderBy: { startDate: 'desc' },
            take: 1,
          },
        },
      });

      await prisma.rolloverBatch.update({
        where: { id: batch.id },
        data: { totalChildren: children.length },
      });

      // Process each child
      let advancedCount = 0;
      let graduatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      const errors: RolloverError[] = [];

      for (const child of children) {
        const result = await this.rolloverChild(
          child,
          batch.id,
          options
        );

        switch (result.status) {
          case 'ADVANCED':
            advancedCount++;
            break;
          case 'GRADUATED':
            graduatedCount++;
            break;
          case 'SKIPPED':
            skippedCount++;
            break;
          case 'ERROR':
            errorCount++;
            if (result.error) {
              errors.push(result.error);
            }
            break;
        }
      }

      // Mark rollover complete
      await prisma.rolloverBatch.update({
        where: { id: batch.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          advancedCount,
          graduatedCount,
          skippedCount,
          errorCount,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: executedById,
          action: 'ANNUAL_ROLLOVER',
          entityType: 'RolloverBatch',
          entityId: batch.id,
          changes: {
            scoutingYear: options.scoutingYear,
            totalChildren: children.length,
            advancedCount,
            graduatedCount,
            skippedCount,
            errorCount,
          },
        },
      });

      return {
        batchId: batch.id,
        scoutingYear: options.scoutingYear,
        totalChildren: children.length,
        advancedCount,
        graduatedCount,
        skippedCount,
        errorCount,
        duration: Date.now() - startTime,
        errors: errors.map(e => ({
          childId: e.childId,
          childName: e.childName,
          currentRank: e.currentRank || 'UNKNOWN',
          errorType: e.errorType,
          errorMessage: e.errorMessage,
        })),
      };

    } catch (error) {
      // Mark rollover as failed
      await prisma.rolloverBatch.update({
        where: { id: batch.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
        },
      });

      throw new BadRequestException(
        `Rollover failed: ${error.message}`
      );
    }
  }

  /**
   * Roll over individual child to next rank
   * Uses transaction to ensure atomicity
   */
  private async rolloverChild(
    child: Child & { advancements: Advancement[] },
    batchId: string,
    options: RolloverOptions
  ): Promise<{
    status: 'ADVANCED' | 'GRADUATED' | 'SKIPPED' | 'ERROR';
    error?: RolloverError;
  }> {
    try {
      // Skip inactive children
      if (!child.isActive && options.skipInactive !== false) {
        return { status: 'SKIPPED' };
      }

      // Get current rank from active advancement
      const currentAdvancement = child.advancements[0];
      if (!currentAdvancement) {
        // No current rank - create error
        await this.createRolloverError(
          batchId,
          child.id,
          `${child.firstName} ${child.lastName}`,
          null,
          'NO_CURRENT_RANK',
          'Child has no current rank assigned'
        );
        return { status: 'ERROR' };
      }

      const currentRank = currentAdvancement.rankLevel;
      const nextRank = this.RANK_PROGRESSION[currentRank];

      // Handle AOL graduation
      if (nextRank === null) {
        await this.graduateChild(child, batchId, options.toDate);
        return { status: 'GRADUATED' };
      }

      // Skip pack-wide "rank"
      if (currentRank === 'PACK_WIDE') {
        return { status: 'SKIPPED' };
      }

      // Execute advancement in transaction
      await prisma.$transaction(async (tx) => {
        // Mark current advancement as inactive
        await tx.advancement.update({
          where: { id: currentAdvancement.id },
          data: {
            isActive: false,
            completionDate: options.fromDate,
          },
        });

        // Create new advancement for next rank
        await tx.advancement.create({
          data: {
            childId: child.id,
            rankLevel: nextRank!,
            startDate: options.toDate,
            isActive: true,
            rolloverBatchId: batchId,
            notes: `Rolled over from ${currentRank}`,
          },
        });

        // Update child's current rank
        await tx.child.update({
          where: { id: child.id },
          data: {
            currentRank: nextRank!,
            denAssignment: options.denReassignments?.[child.id] || child.denAssignment,
            updatedAt: new Date(),
          },
        });

        // Note: Do NOT auto-complete previous rank adventures
        // They remain incomplete, carrying forward to new rank
      });

      return { status: 'ADVANCED' };

    } catch (error) {
      // Store error for reporting
      const errorRecord = await this.createRolloverError(
        batchId,
        child.id,
        `${child.firstName} ${child.lastName}`,
        child.currentRank,
        'DATABASE_ERROR',
        error.message
      );

      return {
        status: 'ERROR',
        error: errorRecord,
      };
    }
  }

  /**
   * Graduate AOL child (mark inactive, create final advancement)
   */
  private async graduateChild(
    child: Child & { advancements: Advancement[] },
    batchId: string,
    graduationDate: Date
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Mark current advancement complete
      const currentAdvancement = child.advancements[0];
      await tx.advancement.update({
        where: { id: currentAdvancement.id },
        data: {
          isActive: false,
          completionDate: graduationDate,
          notes: 'Graduated from AOL',
        },
      });

      // Mark child inactive
      await tx.child.update({
        where: { id: child.id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // Create graduation audit log
      await tx.auditLog.create({
        data: {
          userId: null, // System action
          action: 'CHILD_GRADUATED',
          entityType: 'Child',
          entityId: child.id,
          changes: {
            rolloverBatchId: batchId,
            graduationDate: graduationDate.toISOString(),
            finalRank: 'AOL',
          },
        },
      });
    });
  }

  /**
   * Create rollover error record
   */
  private async createRolloverError(
    batchId: string,
    childId: string,
    childName: string,
    currentRank: RankLevel | null,
    errorType: RolloverErrorType,
    errorMessage: string
  ): Promise<RolloverError> {
    return await prisma.rolloverError.create({
      data: {
        batchId,
        childId,
        childName,
        currentRank,
        errorType,
        errorMessage,
      },
    });
  }

  /**
   * Rollback a completed rollover
   * Reverses all advancements and restores previous state
   * 
   * @param batchId - Rollover batch ID to roll back
   * @param rolledBackById - Admin user performing rollback
   */
  async rollbackRollover(
    batchId: string,
    rolledBackById: string
  ): Promise<void> {
    // Get rollover batch
    const batch = await prisma.rolloverBatch.findUnique({
      where: { id: batchId },
      include: {
        advancements: {
          include: {
            child: {
              include: {
                advancements: {
                  orderBy: { startDate: 'desc' },
                },
              },
            },
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Rollover batch not found');
    }

    if (batch.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Can only rollback completed rollovers'
      );
    }

    if (!batch.canRollback) {
      throw new BadRequestException(
        'This rollover cannot be rolled back'
      );
    }

    // Execute rollback in transaction
    await prisma.$transaction(async (tx) => {
      // Process each advancement created in this rollover
      for (const advancement of batch.advancements) {
        const child = advancement.child;

        // Find the previous advancement (the one before rollover)
        const previousAdvancement = child.advancements.find(
          a => a.id !== advancement.id && !a.isActive
        );

        if (previousAdvancement) {
          // Reactivate previous advancement
          await tx.advancement.update({
            where: { id: previousAdvancement.id },
            data: {
              isActive: true,
              completionDate: null,
            },
          });

          // Restore child's previous rank
          await tx.child.update({
            where: { id: child.id },
            data: {
              currentRank: previousAdvancement.rankLevel,
              isActive: true, // Reactivate if was graduated
            },
          });
        }

        // Delete the rollover advancement
        await tx.advancement.delete({
          where: { id: advancement.id },
        });
      }

      // Mark batch as rolled back
      await tx.rolloverBatch.update({
        where: { id: batchId },
        data: {
          status: 'ROLLED_BACK',
          rolledBackAt: new Date(),
          rollbackById: rolledBackById,
          canRollback: false,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: rolledBackById,
          action: 'ROLLOVER_ROLLBACK',
          entityType: 'RolloverBatch',
          entityId: batchId,
          changes: {
            advancementsRolledBack: batch.advancements.length,
          },
        },
      });
    });
  }

  /**
   * Preview rollover results without committing
   */
  async previewRollover(
    options: RolloverOptions
  ): Promise<{
    totalChildren: number;
    advancements: Array<{
      childName: string;
      currentRank: RankLevel;
      nextRank: RankLevel | 'GRADUATED';
    }>;
    graduations: Array<{
      childName: string;
    }>;
    issues: Array<{
      childName: string;
      issue: string;
    }>;
  }> {
    const children = await prisma.child.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      include: {
        advancements: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    const advancements: any[] = [];
    const graduations: any[] = [];
    const issues: any[] = [];

    for (const child of children) {
      const childName = `${child.firstName} ${child.lastName}`;
      const currentAdvancement = child.advancements[0];

      if (!currentAdvancement) {
        issues.push({
          childName,
          issue: 'No current rank assigned',
        });
        continue;
      }

      const currentRank = currentAdvancement.rankLevel;
      const nextRank = this.RANK_PROGRESSION[currentRank];

      if (nextRank === null) {
        graduations.push({ childName });
      } else if (nextRank === 'PACK_WIDE') {
        issues.push({
          childName,
          issue: 'Has PACK_WIDE rank (not a real rank)',
        });
      } else {
        advancements.push({
          childName,
          currentRank,
          nextRank,
        });
      }
    }

    return {
      totalChildren: children.length,
      advancements,
      graduations,
      issues,
    };
  }

  /**
   * Validate rollover options
   */
  private validateRolloverOptions(options: RolloverOptions): void {
    if (!options.scoutingYear) {
      throw new BadRequestException('Scouting year is required');
    }

    if (!options.fromDate || !options.toDate) {
      throw new BadRequestException('From date and to date are required');
    }

    if (options.toDate <= options.fromDate) {
      throw new BadRequestException(
        'To date must be after from date'
      );
    }

    // Validate scouting year format (e.g., "2025-2026")
    const yearRegex = /^\d{4}-\d{4}$/;
    if (!yearRegex.test(options.scoutingYear)) {
      throw new BadRequestException(
        'Scouting year must be in format YYYY-YYYY (e.g., "2025-2026")'
      );
    }
  }

  /**
   * Get rollover batch details
   */
  async getRolloverBatch(batchId: string): Promise<RolloverBatch> {
    const batch = await prisma.rolloverBatch.findUnique({
      where: { id: batchId },
      include: {
        errors: true,
        executedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Rollover batch not found');
    }

    return batch;
  }

  /**
   * Get rollover history
   */
  async getRolloverHistory(): Promise<RolloverBatch[]> {
    return await prisma.rolloverBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        executedBy: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            advancements: true,
            errors: true,
          },
        },
      },
    });
  }
}
```

#### Controller Implementation

```typescript
// src/api/rollover.controller.ts

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { RolloverService } from '../services/rollover.service';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { TierGuard } from '../middleware/tier.guard';
import { RequireTier } from '../middleware/tier.decorator';
import { GetUser } from '../middleware/get-user.decorator';
import type { JWTPayload } from '../middleware/jwt-auth.middleware';
import { z } from 'zod';

const RolloverSchema = z.object({
  scoutingYear: z.string().regex(/^\d{4}-\d{4}$/, 'Must be YYYY-YYYY format'),
  fromDate: z.string().transform(str => new Date(str)),
  toDate: z.string().transform(str => new Date(str)),
  denReassignments: z.record(z.string()).optional(),
  skipInactive: z.boolean().optional().default(true),
  dryRun: z.boolean().optional().default(false),
});

@Controller('api/rollover')
@UseGuards(JwtAuthGuard, TierGuard)
export class RolloverController {
  constructor(private readonly rolloverService: RolloverService) {}

  /**
   * Execute annual rank rollover
   * POST /api/rollover/execute
   */
  @Post('execute')
  @RequireTier('ADMIN')
  async executeRollover(
    @Body() body: unknown,
    @GetUser() user: JWTPayload
  ) {
    const validation = RolloverSchema.safeParse(body);
    
    if (!validation.success) {
      throw new BadRequestException({
        error: 'Invalid rollover options',
        details: validation.error.issues,
      });
    }

    const summary = await this.rolloverService.executeAnnualRollover(
      validation.data,
      user.userId
    );

    return {
      success: true,
      data: summary,
    };
  }

  /**
   * Preview rollover results
   * POST /api/rollover/preview
   */
  @Post('preview')
  @RequireTier('ADMIN')
  async previewRollover(@Body() body: unknown) {
    const validation = RolloverSchema.safeParse(body);
    
    if (!validation.success) {
      throw new BadRequestException({
        error: 'Invalid rollover options',
        details: validation.error.issues,
      });
    }

    const preview = await this.rolloverService.previewRollover(
      validation.data
    );

    return {
      success: true,
      data: preview,
    };
  }

  /**
   * Rollback a completed rollover
   * POST /api/rollover/:batchId/rollback
   */
  @Post(':batchId/rollback')
  @RequireTier('ADMIN')
  async rollbackRollover(
    @Param('batchId') batchId: string,
    @GetUser() user: JWTPayload
  ) {
    await this.rolloverService.rollbackRollover(batchId, user.userId);

    return {
      success: true,
      message: 'Rollover rolled back successfully',
    };
  }

  /**
   * Get rollover batch details
   * GET /api/rollover/:batchId
   */
  @Get(':batchId')
  @RequireTier('ADMIN')
  async getRolloverBatch(@Param('batchId') batchId: string) {
    const batch = await this.rolloverService.getRolloverBatch(batchId);
    
    return {
      success: true,
      data: batch,
    };
  }

  /**
   * Get rollover history
   * GET /api/rollover
   */
  @Get()
  @RequireTier('ADMIN')
  async getRolloverHistory() {
    const history = await this.rolloverService.getRolloverHistory();
    
    return {
      success: true,
      data: history,
    };
  }
}
```

### Best Practices Summary

#### ✅ DO:
1. **Use comprehensive transactions** - Wrap all child advancement operations in `prisma.$transaction`
2. **Preserve history** - Mark old advancements inactive, don't delete
3. **Preview before execution** - Provide dry-run capability
4. **Support rollback** - Allow reverting rollover if mistakes found
5. **Handle AOL graduation** - Mark children inactive when they graduate
6. **Track batch metadata** - Store counts, timing, errors for auditing
7. **Skip inactive children** - Don't advance children who are no longer active
8. **Validate dates** - Ensure new year dates are logical
9. **Create audit logs** - Log all rollover actions
10. **Test thoroughly** - Write comprehensive tests for edge cases

#### ❌ DON'T:
1. **Don't auto-complete adventures** - Unfinished adventures stay incomplete
2. **Don't delete old advancements** - Soft delete by marking inactive
3. **Don't allow duplicate rollovers** - Check for existing rollover for year
4. **Don't skip graduations** - AOL children must be marked inactive
5. **Don't lose transaction context** - All child operations must be atomic
6. **Don't forget edge cases** - Transfers, inactive members, missing ranks
7. **Don't skip validation** - Verify all inputs before execution

#### Transaction Strategy:
- **Per-child transactions** - Each child advancement is isolated
- **Rollback entire batch** - If critical error, mark batch FAILED
- **Long-running operation** - Consider progress updates for large packs
- **Deadlock prevention** - Process children in consistent order (by ID)

#### Testing Strategy:
```typescript
describe('RolloverService', () => {
  describe('executeAnnualRollover', () => {
    it('should advance Lion to Tiger', async () => {
      // Setup: Create Lion child
      // Execute: Run rollover
      // Assert: Child is now Tiger, Lion advancement inactive
    });

    it('should graduate AOL children', async () => {
      // Setup: Create AOL child
      // Execute: Run rollover
      // Assert: Child inactive, advancement complete
    });

    it('should skip inactive children', async () => {
      // Setup: Create inactive child
      // Execute: Run rollover
      // Assert: Child unchanged
    });

    it('should preserve incomplete adventures', async () => {
      // Setup: Create child with incomplete adventures
      // Execute: Run rollover
      // Assert: Adventures still incomplete in new rank
    });

    it('should rollback successfully', async () => {
      // Setup: Execute rollover
      // Execute: Rollback
      // Assert: All children restored to previous ranks
    });

    it('should handle children without ranks', async () => {
      // Setup: Create child without rank
      // Execute: Run rollover
      // Assert: Error logged, child skipped
    });

    it('should update den assignments', async () => {
      // Setup: Create children with den reassignments
      // Execute: Run rollover
      // Assert: Den assignments updated
    });

    it('should be atomic - all or nothing per child', async () => {
      // Setup: Create scenario that causes DB error mid-child
      // Execute: Run rollover
      // Assert: Failed child unchanged, others succeed
    });
  });
});
```

### Integration Considerations

#### Progress Reporting:
For packs with 100+ children, consider:
- WebSocket connection for real-time progress
- Server-Sent Events for progress updates
- Polling endpoint: `GET /api/rollover/:batchId/progress`

#### Scheduled Rollover:
If rollover should run automatically:
- Use NestJS `@nestjs/schedule` package
- Create cron job to check pack config year-end date
- Send admin notification when rollover ready
- Require manual approval before execution

#### Email Notifications:
After rollover:
- Email admins with summary (counts, errors)
- Email parents with child's new rank (opt-in)
- Include link to rollover details page

---

## Comparison Matrix

| Feature | CSV Import | Annual Rollover |
|---------|-----------|-----------------|
| **Transaction Scope** | Per-row (independent) | Per-child (independent) |
| **Failure Handling** | Partial success | Partial success |
| **Rollback Support** | No rollback needed | Full rollback support |
| **Historical Preservation** | Update existing records | Mark old records inactive |
| **Validation** | Row-by-row validation | Pre-flight validation + per-child |
| **Progress Tracking** | Batch processing counts | Batch processing counts |
| **Error Storage** | ImportError table | RolloverError table |
| **Idempotency** | Re-import updates records | Rollover checked annually |
| **Audit Trail** | ImportBatch + AuditLog | RolloverBatch + AuditLog |
| **Typical Volume** | 50-200 rows | 30-150 children |
| **Performance** | Streaming + batching | Transaction per child |
| **Testing Focus** | Validation edge cases | Advancement logic + history |

---

## Additional Resources

### Recommended Packages
- `csv-parse`: CSV parsing with streaming support
- `@nestjs/schedule`: Cron jobs for automated tasks
- `@nestjs/bull`: Background job processing for large operations
- `archiver`: For exporting rollover reports as ZIP

### Prisma Best Practices
- [Transactions Guide](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [Batch Operations](https://www.prisma.io/docs/concepts/components/prisma-client/crud#bulk-operations)
- [Middleware for Auditing](https://www.prisma.io/docs/concepts/components/prisma-client/middleware)

### Testing Resources
- Use `prisma.$transaction()` with test isolation
- Create fixture factories for child/volunteer test data
- Test rollback scenarios thoroughly
- Mock CSV file uploads with `supertest`

---

## Implementation Checklist

### CSV Import
- [ ] Install `csv-parse` package
- [ ] Create `ImportBatch`, `ImportError`, `Child`, `ChildToParent` models
- [ ] Implement `ImportService` with streaming
- [ ] Create validation logic for CSV rows
- [ ] Add `ImportController` with file upload
- [ ] Write unit tests for validation
- [ ] Write e2e tests for import flow
- [ ] Add admin UI for import history
- [ ] Document CSV format and required columns

### Annual Rollover
- [ ] Create `RolloverBatch`, `RolloverError` models
- [ ] Add `Advancement`, `AdventureProgress` models
- [ ] Implement `RolloverService` with transactions
- [ ] Add rollback functionality
- [ ] Create preview/dry-run endpoint
- [ ] Write comprehensive unit tests
- [ ] Test rollback scenarios
- [ ] Add admin UI for rollover execution
- [ ] Create rollover history dashboard
- [ ] Document rollover process for admins

### Shared Patterns
- [ ] Extend `AuditLog` to capture both operations
- [ ] Add progress tracking endpoints
- [ ] Implement error notification system
- [ ] Create admin dashboard for bulk operations
- [ ] Document error codes and recovery procedures
- [ ] Set up monitoring and alerting

---

## Conclusion

Both bulk operation patterns share common principles:
- **Atomicity per entity** (row/child) with isolated transactions
- **Partial success support** to avoid all-or-nothing failures
- **Comprehensive error tracking** for debugging and user feedback
- **Audit trails** for compliance and debugging
- **Idempotency** for safe re-execution
- **Progress reporting** for long-running operations

The key difference is **rollback capability** - rollovers need it, imports don't (just re-import corrected data).

For your volunteer webapp, implement CSV import first (needed for initial data load), then annual rollover (needed once per year). Both patterns will serve as templates for future bulk operations (e.g., bulk point awards, bulk event signups).
