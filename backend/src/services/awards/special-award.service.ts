import { ConflictException, Injectable } from '@nestjs/common';
import prisma from '../../utils/prisma';
import { CreateSpecialAwardDto } from '../../models/awards/create-special-award.dto';

@Injectable()
export class SpecialAwardService {
  async createSpecialAward(input: CreateSpecialAwardDto) {
    try {
      const created = await prisma.specialAward.create({
        data: {
          name: input.name,
          description: input.description,
          category: input.category,
          requiresNomination: input.requiresNomination ?? false,
        },
      });

      return {
        id: created.id,
        name: created.name,
        description: created.description,
        category: created.category,
        requiresNomination: created.requiresNomination,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('A special award with that name already exists');
      }

      throw error;
    }
  }
}
