import { ConflictException } from '@nestjs/common';
import { SpecialAwardService } from './special-award.service';

const mockPrisma = {
  specialAward: {
    create: jest.fn(),
  },
};

jest.mock('../../utils/prisma', () => ({
  __esModule: true,
  get default() {
    return mockPrisma;
  },
}));

describe('SpecialAwardService', () => {
  let service: SpecialAwardService;

  beforeEach(() => {
    service = new SpecialAwardService();
    jest.clearAllMocks();
  });

  it('creates special award', async () => {
    const now = new Date('2026-05-25T00:00:00.000Z');

    mockPrisma.specialAward.create.mockResolvedValue({
      id: 'special-1',
      name: 'Summit Award',
      description: 'Special recognition',
      category: 'Character',
      requiresNomination: true,
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.createSpecialAward({
      name: 'Summit Award',
      description: 'Special recognition',
      category: 'Character',
      requiresNomination: true,
    });

    expect(result).toMatchObject({
      id: 'special-1',
      name: 'Summit Award',
      category: 'Character',
      requiresNomination: true,
    });
  });

  it('throws conflict on duplicate name', async () => {
    mockPrisma.specialAward.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.createSpecialAward({
        name: 'Summit Award',
        category: 'Character',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
