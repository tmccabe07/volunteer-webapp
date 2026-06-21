import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthTier, ImportStatus, RoleType } from '@prisma/client';
import * as crypto from 'crypto';
import prisma from '../../utils/prisma';
import { parseCsv } from '../../utils/csv-parser';

const VALID_AUTH_TIERS: AuthTier[] = [AuthTier.LEADER, AuthTier.DEN_CHIEF, AuthTier.ADMIN];

const DEN_SCOPED_ROLE_TYPES: RoleType[] = [
  RoleType.DEN_LEADER,
  RoleType.ASSISTANT_DEN_LEADER,
  RoleType.LION_GUIDE,
];

const INVITE_EXPIRY_HOURS = 72;

function generateInviteToken(): { token: string; hashedToken: string } {
  const tokenBuffer = crypto.randomBytes(32);
  const token = tokenBuffer.toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hashedToken };
}

@Injectable()
export class ImportLeadersService {
  async processLeaderCsv(fileName: string, csvContent: string, uploadedBy: string) {
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
        const email = row.email?.trim().toLowerCase();
        const name = row.name?.trim();
        const authTier = row.authTier?.trim() as AuthTier;
        const denNumber = row.denNumber?.trim() ? Number(row.denNumber.trim()) : undefined;

        if (!email) {
          throw new BadRequestException('Email is required');
        }

        if (!name) {
          throw new BadRequestException('Name is required');
        }

        if (!VALID_AUTH_TIERS.includes(authTier)) {
          throw new BadRequestException(
            `Invalid authTier: ${row.authTier ?? ''}. Must be LEADER, DEN_CHIEF, or ADMIN`,
          );
        }

        const den = denNumber
          ? await prisma.den.findFirst({
              where: { denNumber, isActive: true, deletedAt: null },
            })
          : null;

        if (denNumber && !den) {
          throw new BadRequestException(`Den ${denNumber} not found or is inactive`);
        }

        let volunteer = await prisma.volunteer.findFirst({
          where: { email, deletedAt: null },
        });

        if (!volunteer) {
          const placeholderHash = crypto.randomBytes(32).toString('hex');
          volunteer = await prisma.volunteer.create({
            data: {
              email,
              name,
              passwordHash: placeholderHash,
              authTier,
              mustChangePassword: true,
            },
          });

          const { token, hashedToken } = generateInviteToken();
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + INVITE_EXPIRY_HOURS);

          await prisma.passwordReset.create({
            data: {
              email: volunteer.email,
              token: hashedToken,
              expiresAt,
              used: false,
            },
          });

          inviteLinks.push({ email: volunteer.email, name: volunteer.name, token });
        } else {
          const tierOrder: AuthTier[] = [
            AuthTier.PARENT,
            AuthTier.LEADER,
            AuthTier.DEN_CHIEF,
            AuthTier.ADMIN,
          ];
          const currentIndex = tierOrder.indexOf(volunteer.authTier);
          const newIndex = tierOrder.indexOf(authTier);

          await prisma.volunteer.update({
            where: { id: volunteer.id },
            data: {
              name,
              authTier: newIndex > currentIndex ? authTier : volunteer.authTier,
            },
          });
        }

        if (den) {
          const matchingRole = await prisma.volunteerRole.findFirst({
            where: {
              grantsTier: authTier,
              roleType: { in: DEN_SCOPED_ROLE_TYPES },
              deletedAt: null,
            },
          });

          if (matchingRole) {
            const existingAssignment = await prisma.volunteerToRole.findFirst({
              where: {
                volunteerId: volunteer.id,
                roleId: matchingRole.id,
                denNumber: den.denNumber,
                removedAt: null,
              },
            });

            if (!existingAssignment) {
              await prisma.volunteerToRole.create({
                data: {
                  volunteerId: volunteer.id,
                  roleId: matchingRole.id,
                  denId: den.id,
                  denNumber: den.denNumber,
                },
              });
            }
          }
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
