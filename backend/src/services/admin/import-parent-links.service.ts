import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthTier, ImportStatus, LinkStatus } from '@prisma/client';
import * as crypto from 'crypto';
import prisma from '../../utils/prisma';
import { parseCsv } from '../../utils/csv-parser';

const INVITE_EXPIRY_HOURS = 72;

function generateInviteToken(): { token: string; hashedToken: string } {
  const tokenBuffer = crypto.randomBytes(32);
  const token = tokenBuffer.toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hashedToken };
}

@Injectable()
export class ImportParentLinksService {
  async processParentLinkCsv(fileName: string, csvContent: string, uploadedBy: string) {
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
    const inviteLinks: Array<{ email: string; name: string; token: string }> = [];

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const rowNumber = rowIndex + 2;
      const row = rows[rowIndex];

      try {
        const parentEmail = row.parentEmail?.trim().toLowerCase();
        const parentName = row.parentName?.trim();
        const scoutFirstName = row.scoutFirstName?.trim();
        const scoutLastName = row.scoutLastName?.trim();
        const relationshipType = row.relationshipType?.trim() || 'guardian';

        if (!parentEmail) {
          throw new BadRequestException('parentEmail is required');
        }

        if (!parentName) {
          throw new BadRequestException('parentName is required');
        }

        if (!scoutFirstName || !scoutLastName) {
          throw new BadRequestException('scoutFirstName and scoutLastName are required');
        }

        const scout = await prisma.childScout.findFirst({
          where: { firstName: scoutFirstName, lastName: scoutLastName, deletedAt: null },
          select: { id: true },
        });

        if (!scout) {
          throw new BadRequestException(
            `Cub scout "${scoutFirstName} ${scoutLastName}" not found`,
          );
        }

        let parent = await prisma.volunteer.findFirst({
          where: { email: parentEmail, deletedAt: null },
        });

        let isNewParent = false;
        if (!parent) {
          const placeholderHash = crypto.randomBytes(32).toString('hex');
          parent = await prisma.volunteer.create({
            data: {
              email: parentEmail,
              name: parentName,
              passwordHash: placeholderHash,
              authTier: AuthTier.PARENT,
              mustChangePassword: true,
            },
          });
          isNewParent = true;
        }

        if (isNewParent) {
          const { token, hashedToken } = generateInviteToken();
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + INVITE_EXPIRY_HOURS);

          await prisma.passwordReset.create({
            data: {
              email: parent.email,
              token: hashedToken,
              expiresAt,
              used: false,
            },
          });

          inviteLinks.push({ email: parent.email, name: parent.name, token });
        }

        const existingLink = await prisma.parentChildLink.findFirst({
          where: {
            parentId: parent.id,
            childScoutId: scout.id,
            status: { in: [LinkStatus.APPROVED, LinkStatus.PENDING] },
          },
        });

        if (existingLink?.status === LinkStatus.APPROVED) {
          successRows += 1;
          continue;
        }

        if (existingLink?.status === LinkStatus.PENDING) {
          await prisma.parentChildLink.update({
            where: { id: existingLink.id },
            data: {
              status: LinkStatus.APPROVED,
              processedAt: new Date(),
              processedBy: uploadedBy,
            },
          });
        } else {
          await prisma.parentChildLink.create({
            data: {
              parentId: parent.id,
              childScoutId: scout.id,
              relationshipType,
              status: LinkStatus.APPROVED,
              requestedBy: uploadedBy,
              processedAt: new Date(),
              processedBy: uploadedBy,
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

    return { batchId: batch.id, inviteLinks };
  }
}
