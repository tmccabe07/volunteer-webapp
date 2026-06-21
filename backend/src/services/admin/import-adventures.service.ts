import { BadRequestException, Injectable } from '@nestjs/common';
import { AdventureType, ImportStatus, RankLevel } from '@prisma/client';
import prisma from '../../utils/prisma';
import { parseCsv } from '../../utils/csv-parser';

const VALID_RANK_LEVELS: RankLevel[] = [
  RankLevel.LION,
  RankLevel.TIGER,
  RankLevel.WOLF,
  RankLevel.BEAR,
  RankLevel.WEBELOS,
  RankLevel.AOL,
  RankLevel.PACK_WIDE,
];

const VALID_CLASSIFICATIONS: AdventureType[] = [
  AdventureType.REQUIRED,
  AdventureType.ELECTIVE,
  AdventureType.SPECIAL_ELECTIVE,
];

@Injectable()
export class ImportAdventuresService {
  async processAdventureCsv(fileName: string, csvContent: string, uploadedBy: string) {
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
        const rankLevel = row.rankLevel?.trim() as RankLevel;
        const adventureName = row.adventureName?.trim();
        const classification = row.classification?.trim() as AdventureType;
        const adventureDisplayOrder = row.adventureDisplayOrder?.trim()
          ? Number(row.adventureDisplayOrder.trim())
          : undefined;
        const requirementOrder = row.requirementOrder?.trim()
          ? Number(row.requirementOrder.trim())
          : undefined;
        const requirementText = row.requirementText?.trim();
        const description = row.description?.trim() || undefined;
        const catalogYear = row.catalogYear?.trim();

        if (!VALID_RANK_LEVELS.includes(rankLevel)) {
          throw new BadRequestException(
            `Invalid rankLevel: ${row.rankLevel ?? ''}. Must be LION, TIGER, WOLF, BEAR, WEBELOS, AOL, or PACK_WIDE`,
          );
        }

        if (!adventureName) {
          throw new BadRequestException('adventureName is required');
        }

        if (!VALID_CLASSIFICATIONS.includes(classification)) {
          throw new BadRequestException(
            `Invalid classification: ${row.classification ?? ''}. Must be REQUIRED, ELECTIVE, or SPECIAL_ELECTIVE`,
          );
        }

        if (adventureDisplayOrder === undefined || isNaN(adventureDisplayOrder)) {
          throw new BadRequestException('adventureDisplayOrder must be a number');
        }

        if (requirementOrder === undefined || isNaN(requirementOrder)) {
          throw new BadRequestException('requirementOrder must be a number');
        }

        if (!requirementText) {
          throw new BadRequestException('requirementText is required');
        }

        if (!catalogYear) {
          throw new BadRequestException('catalogYear is required');
        }

        const rank = await prisma.rank.findFirst({
          where: { rankLevel, isActive: true },
          select: { id: true },
        });

        if (!rank) {
          throw new BadRequestException(`Rank ${rankLevel} not found or is inactive`);
        }

        const adventure = await prisma.adventure.upsert({
          where: {
            rankId_name_catalogYear: {
              rankId: rank.id,
              name: adventureName,
              catalogYear,
            },
          },
          update: {
            classification,
            displayOrder: adventureDisplayOrder,
            description,
            isActive: true,
          },
          create: {
            rankId: rank.id,
            name: adventureName,
            classification,
            displayOrder: adventureDisplayOrder,
            description,
            catalogYear,
            isActive: true,
          },
        });

        await prisma.requirement.upsert({
          where: {
            adventureId_displayOrder: {
              adventureId: adventure.id,
              displayOrder: requirementOrder,
            },
          },
          update: {
            requirementText,
          },
          create: {
            adventureId: adventure.id,
            displayOrder: requirementOrder,
            requirementText,
          },
        });

        successRows += 1;
      } catch (error: any) {
        failedRows += 1;
        await prisma.importError.create({
          data: {
            batchId: batch.id,
            rowNumber,
            errorMessage: error instanceof Error ? error.message : 'Failed to import row',
            rowData: row,
          },
        });
      }
    }

    const status = failedRows > 0 ? ImportStatus.COMPLETED_WITH_ERRORS : ImportStatus.COMPLETED;

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { totalRows: rows.length, successRows, failedRows, status },
    });

    return { batchId: batch.id, message: 'Import processing complete' };
  }
}
