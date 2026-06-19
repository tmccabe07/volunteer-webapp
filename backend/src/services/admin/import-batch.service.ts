import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ImportStatus, RankLevel } from '@prisma/client';
import prisma from '../../utils/prisma';

const RANK_LEVELS: RankLevel[] = [
  RankLevel.LION,
  RankLevel.TIGER,
  RankLevel.WOLF,
  RankLevel.BEAR,
  RankLevel.WEBELOS,
  RankLevel.AOL,
];

type CsvRow = Record<string, string>;

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current);
  return values.map(value => value.trim());
}

function parseCsv(csvContent: string): CsvRow[] {
  const normalized = csvContent.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const lines = normalized.split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map(header => header.trim());

  return lines.slice(1).map(line => {
    const values = splitCsvLine(line);
    return headers.reduce<CsvRow>((row, header, index) => {
      row[header] = values[index] ?? '';
      return row;
    }, {});
  });
}

function getRankIndex(rank: string): number {
  return RANK_LEVELS.indexOf(rank as RankLevel);
}

@Injectable()
export class ImportBatchService {
  async processChildScoutCsv(fileName: string, csvContent: string, uploadedBy: string) {
    const batch = await prisma.importBatch.create({
      data: {
        fileName,
        uploadedBy,
        status: ImportStatus.PROCESSING,
      },
    });

    const rows = parseCsv(csvContent);
    let successRows = 0;
    let failedRows = 0;

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const rowNumber = rowIndex + 2;
      const row = rows[rowIndex];

      try {
        const firstName = row.firstName?.trim();
        const lastName = row.lastName?.trim();
        const currentRank = row.currentRank?.trim() as RankLevel;
        const scoutbookId = row.scoutbookId?.trim() || undefined;
        const denNumber = row.denNumber?.trim() ? Number(row.denNumber.trim()) : undefined;

        if (!firstName || !lastName) {
          throw new BadRequestException('First name and last name are required');
        }

        if (getRankIndex(currentRank) < 0) {
          throw new BadRequestException(`Invalid rank level: ${row.currentRank ?? ''}`);
        }

        const existingChild = await prisma.childScout.findFirst({
          where: {
            firstName,
            lastName,
            deletedAt: null,
          },
          select: { id: true },
        });

        if (existingChild) {
          throw new ConflictException('A child scout with the same first and last name already exists');
        }

        if (scoutbookId) {
          const existingScoutbookId = await prisma.childScout.findFirst({
            where: {
              scoutbookId,
              deletedAt: null,
            },
            select: { id: true },
          });

          if (existingScoutbookId) {
            throw new ConflictException(`Scoutbook ID ${scoutbookId} is already in use`);
          }
        }

        const den = denNumber
          ? await prisma.den.findFirst({
              where: {
                denNumber,
                deletedAt: null,
                isActive: true,
              },
            })
          : null;

        if (denNumber && !den) {
          throw new NotFoundException(`Den ${denNumber} not found`);
        }

        if (den && den.rankLevel !== currentRank) {
          throw new BadRequestException(
            `Scout rank ${currentRank} does not match den rank ${den.rankLevel}`,
          );
        }

        const child = await prisma.childScout.create({
          data: {
            firstName,
            lastName,
            currentRank,
            scoutbookId,
            isActive: true,
            createdBy: uploadedBy,
          },
        });

        if (den) {
          await prisma.denMembership.create({
            data: {
              childScoutId: child.id,
              denId: den.id,
              assignedBy: uploadedBy,
              reason: 'CSV import',
            },
          });
        }

        successRows += 1;
      } catch (error: any) {
        failedRows += 1;
        await prisma.importError.create({
          data: {
            batchId: batch.id,
            rowNumber,
            fieldName: undefined,
            errorMessage: error instanceof Error ? error.message : 'Failed to import row',
            rowData: row,
          },
        });
      }
    }

    const status = failedRows > 0 ? ImportStatus.COMPLETED_WITH_ERRORS : ImportStatus.COMPLETED;

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        totalRows: rows.length,
        successRows,
        failedRows,
        status,
      },
    });

    return {
      batchId: batch.id,
      message: 'Import processing started',
    };
  }

  async getImportBatch(batchId: string) {
    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
      include: {
        errors: {
          orderBy: { rowNumber: 'asc' },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Import batch not found');
    }

    return {
      id: batch.id,
      fileName: batch.fileName,
      status: batch.status,
      uploadedAt: batch.uploadedAt.toISOString(),
      uploadedBy: batch.uploadedBy,
      totalRows: batch.totalRows,
      successRows: batch.successRows,
      failedRows: batch.failedRows,
      errors: batch.errors.map(error => ({
        rowNumber: error.rowNumber,
        fieldName: error.fieldName,
        errorMessage: error.errorMessage,
        rowData: error.rowData,
      })),
    };
  }
}