/**
 * Pack Configuration Service
 * 
 * Business logic for pack configuration management
 * User Story 8 - Pack and Role Configuration
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import prisma from '../utils/prisma';
import type { UpdatePackConfigInput } from '../utils/validation/config.schema';
import type { PackConfig } from '@prisma/client';

@Injectable()
export class PackConfigService {
  /**
   * Get current pack configuration
   * 
   * @returns Pack configuration
   * @throws NotFoundException if no pack config exists
   */
  async getPackConfig(): Promise<PackConfig> {
    const config = await prisma.packConfig.findFirst();
    
    if (!config) {
      throw new NotFoundException('Pack configuration not found');
    }
    
    return config;
  }

  /**
   * Update pack configuration
   * 
   * Side effects:
   * - If yearEndDate changed, updates recurringEndDate for all recurring events/tasks
   * - Creates audit log entry
   * 
   * @param data - Pack configuration updates
   * @param updatedById - User ID making the change
   * @returns Updated pack configuration
   * @throws NotFoundException if no pack config exists
   * @throws BadRequestException if validation fails
   */
  async updatePackConfig(
    data: UpdatePackConfigInput,
    updatedById: string
  ): Promise<PackConfig> {
    const existingConfig = await prisma.packConfig.findFirst();
    
    if (!existingConfig) {
      throw new NotFoundException('Pack configuration not found');
    }

    // Start a transaction to update config and cascade year-end date changes
    return await prisma.$transaction(async (tx) => {
      // Update pack configuration
      const updatedConfig = await tx.packConfig.update({
        where: { id: existingConfig.id },
        data: {
          ...(data.packName && { packName: data.packName }),
          ...(data.packNumber && { packNumber: data.packNumber }),
          ...(data.yearStartDate && { yearStartDate: new Date(data.yearStartDate) }),
          ...(data.yearEndDate && { yearEndDate: new Date(data.yearEndDate) }),
          ...(data.activeRanks && { activeRanks: data.activeRanks }),
        },
      });

      // If yearEndDate changed, cascade to recurring events and tasks
      if (data.yearEndDate) {
        const newYearEndDate = new Date(data.yearEndDate);

        // Update recurring events
        await tx.event.updateMany({
          where: { 
            isRecurring: true,
            recurringEndDate: { not: null }
          },
          data: { 
            recurringEndDate: newYearEndDate 
          },
        });

        // Update recurring admin tasks
        await tx.adminTask.updateMany({
          where: { 
            isRecurring: true,
            recurringEndDate: { not: null }
          },
          data: { 
            recurringEndDate: newYearEndDate 
          },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: updatedById,
          action: 'UPDATE_PACK_CONFIG',
          entityType: 'PackConfig',
          entityId: updatedConfig.id,
          changes: data,
        },
      });

      return updatedConfig;
    });
  }
}
