import { ActivitySlotStepService } from './activity-slot-step.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  setupTests,
  teardownTests,
  createTestVolunteer,
  createTestActivityType,
  createTestEvent,
  prisma,
} from '../test/test-utils';

describe('ActivitySlotStepService', () => {
  let service: ActivitySlotStepService;
  let testVolunteer: any;
  let testEvent: any;
  let testActivitySlot: any;

  beforeAll(async () => {
    await setupTests();
  });

  afterAll(async () => {
    await teardownTests();
  });

  beforeEach(async () => {
    service = new ActivitySlotStepService();
    
    // Create test data: volunteer, activity type, event with activity slot
    testVolunteer = await createTestVolunteer();
    const activityType = await createTestActivityType();
    testEvent = await createTestEvent(testVolunteer.id);
    
    // Create activity slot manually
    testActivitySlot = await prisma.activitySlot.create({
      data: {
        eventId: testEvent.id,
        activityTypeId: activityType.id,
        capacity: 5,
      },
      include: {
        activityType: true,
      },
    });
  });

  afterEach(async () => {
    // Clean up in order to respect foreign key constraints
    await prisma.activitySlotStep.deleteMany();
    await prisma.signup.deleteMany();
    await prisma.activitySlot.deleteMany();
    await prisma.event.deleteMany();
    await prisma.pointEvent.deleteMany();
    await prisma.badgeTierHistory.deleteMany();
    await prisma.volunteerPointBalance.deleteMany();
    await prisma.leaderboardCache.deleteMany();
    await prisma.childRank.deleteMany();
    await prisma.volunteerToRole.deleteMany();
    await prisma.volunteer.deleteMany();
    await prisma.activityType.deleteMany();
  });

  describe('addStep', () => {
    it('should add a step with orderIndex 0 to empty activity slot', async () => {
      const step = await service.addStep(testActivitySlot.id, 'First step');

      expect(step.activitySlotId).toBe(testActivitySlot.id);
      expect(step.orderIndex).toBe(0);
      expect(step.stepText).toBe('First step');
    });

    it('should add subsequent steps with incremented orderIndex', async () => {
      await service.addStep(testActivitySlot.id, 'First step');
      await service.addStep(testActivitySlot.id, 'Second step');
      const thirdStep = await service.addStep(testActivitySlot.id, 'Third step');

      expect(thirdStep.orderIndex).toBe(2);
      expect(thirdStep.stepText).toBe('Third step');
    });

    it('should throw NotFoundException for non-existent activity slot', async () => {
      await expect(
        service.addStep('non-existent-id', 'Test step')
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce max 20 steps per activity slot', async () => {
      // Add 20 steps
      for (let i = 0; i < 20; i++) {
        await service.addStep(testActivitySlot.id, `Step ${i + 1}`);
      }

      // Try to add 21st step
      await expect(
        service.addStep(testActivitySlot.id, 'Step 21')
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addStep(testActivitySlot.id, 'Step 21')
      ).rejects.toThrow('Cannot add more than 20 steps per activity slot');
    });

    it('should handle step text with leading/trailing spaces', async () => {
      const step = await service.addStep(testActivitySlot.id, '  Spaced step  ');

      // Note: trimming happens in validation schema, not service
      // This test verifies service handles the raw input
      expect(step.stepText).toBe('  Spaced step  ');
    });
  });

  describe('removeStep', () => {
    it('should remove a step successfully', async () => {
      const step = await service.addStep(testActivitySlot.id, 'Step to remove');

      await service.removeStep(step.id);

      const steps = await service.getStepsBySlot(testActivitySlot.id);
      expect(steps.length).toBe(0);
    });

    it('should renumber remaining steps after removal', async () => {
      const step1 = await service.addStep(testActivitySlot.id, 'Step 1');
      const step2 = await service.addStep(testActivitySlot.id, 'Step 2');
      const step3 = await service.addStep(testActivitySlot.id, 'Step 3');

      // Remove middle step
      await service.removeStep(step2.id);

      const remainingSteps = await service.getStepsBySlot(testActivitySlot.id);
      expect(remainingSteps.length).toBe(2);
      expect(remainingSteps[0].id).toBe(step1.id);
      expect(remainingSteps[0].orderIndex).toBe(0);
      expect(remainingSteps[1].id).toBe(step3.id);
      expect(remainingSteps[1].orderIndex).toBe(1); // Renumbered from 2 to 1
    });

    it('should throw NotFoundException for non-existent step', async () => {
      await expect(
        service.removeStep('non-existent-id')
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle removing first step', async () => {
      const step1 = await service.addStep(testActivitySlot.id, 'Step 1');
      const step2 = await service.addStep(testActivitySlot.id, 'Step 2');
      const step3 = await service.addStep(testActivitySlot.id, 'Step 3');

      await service.removeStep(step1.id);

      const remainingSteps = await service.getStepsBySlot(testActivitySlot.id);
      expect(remainingSteps.length).toBe(2);
      expect(remainingSteps[0].id).toBe(step2.id);
      expect(remainingSteps[0].orderIndex).toBe(0);
      expect(remainingSteps[1].id).toBe(step3.id);
      expect(remainingSteps[1].orderIndex).toBe(1);
    });

    it('should handle removing last step (no renumbering needed)', async () => {
      const step1 = await service.addStep(testActivitySlot.id, 'Step 1');
      const step2 = await service.addStep(testActivitySlot.id, 'Step 2');
      const step3 = await service.addStep(testActivitySlot.id, 'Step 3');

      await service.removeStep(step3.id);

      const remainingSteps = await service.getStepsBySlot(testActivitySlot.id);
      expect(remainingSteps.length).toBe(2);
      expect(remainingSteps[0].orderIndex).toBe(0);
      expect(remainingSteps[1].orderIndex).toBe(1);
    });
  });

  describe('reorderSteps', () => {
    it('should reorder steps correctly', async () => {
      const step1 = await service.addStep(testActivitySlot.id, 'Step 1');
      const step2 = await service.addStep(testActivitySlot.id, 'Step 2');
      const step3 = await service.addStep(testActivitySlot.id, 'Step 3');

      // Reorder: [1, 2, 3] -> [3, 1, 2]
      await service.reorderSteps(testActivitySlot.id, [step3.id, step1.id, step2.id]);

      const reorderedSteps = await service.getStepsBySlot(testActivitySlot.id);
      expect(reorderedSteps.length).toBe(3);
      expect(reorderedSteps[0].id).toBe(step3.id);
      expect(reorderedSteps[0].orderIndex).toBe(0);
      expect(reorderedSteps[1].id).toBe(step1.id);
      expect(reorderedSteps[1].orderIndex).toBe(1);
      expect(reorderedSteps[2].id).toBe(step2.id);
      expect(reorderedSteps[2].orderIndex).toBe(2);
    });

    it('should throw NotFoundException for non-existent activity slot', async () => {
      await expect(
        service.reorderSteps('non-existent-id', ['step-id-1', 'step-id-2'])
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if step IDs do not belong to activity slot', async () => {
      const step1 = await service.addStep(testActivitySlot.id, 'Step 1');
      const otherActivitySlot = await prisma.activitySlot.create({
        data: {
          eventId: testEvent.id,
          activityTypeId: testActivitySlot.activityTypeId,
        },
      });
      const otherStep = await service.addStep(otherActivitySlot.id, 'Other step');

      await expect(
        service.reorderSteps(testActivitySlot.id, [step1.id, otherStep.id])
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.reorderSteps(testActivitySlot.id, [step1.id, otherStep.id])
      ).rejects.toThrow('do not belong to activity slot');
    });

    it('should throw BadRequestException if step count does not match', async () => {
      const step1 = await service.addStep(testActivitySlot.id, 'Step 1');
      const step2 = await service.addStep(testActivitySlot.id, 'Step 2');
      const step3 = await service.addStep(testActivitySlot.id, 'Step 3');

      // Only provide 2 out of 3 step IDs
      await expect(
        service.reorderSteps(testActivitySlot.id, [step1.id, step2.id])
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.reorderSteps(testActivitySlot.id, [step1.id, step2.id])
      ).rejects.toThrow('Must provide all 3 step IDs for reordering');
    });

    it('should handle single step reordering (no-op)', async () => {
      const step1 = await service.addStep(testActivitySlot.id, 'Only step');

      await service.reorderSteps(testActivitySlot.id, [step1.id]);

      const steps = await service.getStepsBySlot(testActivitySlot.id);
      expect(steps.length).toBe(1);
      expect(steps[0].id).toBe(step1.id);
      expect(steps[0].orderIndex).toBe(0);
    });
  });

  describe('getStepsBySlot', () => {
    it('should return empty array for activity slot with no steps', async () => {
      const steps = await service.getStepsBySlot(testActivitySlot.id);

      expect(steps).toEqual([]);
    });

    it('should return steps in order by orderIndex', async () => {
      await service.addStep(testActivitySlot.id, 'Step 1');
      await service.addStep(testActivitySlot.id, 'Step 2');
      await service.addStep(testActivitySlot.id, 'Step 3');

      const steps = await service.getStepsBySlot(testActivitySlot.id);

      expect(steps.length).toBe(3);
      expect(steps[0].stepText).toBe('Step 1');
      expect(steps[0].orderIndex).toBe(0);
      expect(steps[1].stepText).toBe('Step 2');
      expect(steps[1].orderIndex).toBe(1);
      expect(steps[2].stepText).toBe('Step 3');
      expect(steps[2].orderIndex).toBe(2);
    });

    it('should not return steps from other activity slots', async () => {
      await service.addStep(testActivitySlot.id, 'Step 1');
      
      const otherActivitySlot = await prisma.activitySlot.create({
        data: {
          eventId: testEvent.id,
          activityTypeId: testActivitySlot.activityTypeId,
        },
      });
      await service.addStep(otherActivitySlot.id, 'Other step');

      const steps = await service.getStepsBySlot(testActivitySlot.id);

      expect(steps.length).toBe(1);
      expect(steps[0].stepText).toBe('Step 1');
    });
  });

  describe('updateStep', () => {
    it('should update step text successfully', async () => {
      const step = await service.addStep(testActivitySlot.id, 'Original text');

      const updated = await service.updateStep(step.id, 'Updated text');

      expect(updated.id).toBe(step.id);
      expect(updated.stepText).toBe('Updated text');
      expect(updated.orderIndex).toBe(step.orderIndex);
    });

    it('should throw NotFoundException for non-existent step', async () => {
      await expect(
        service.updateStep('non-existent-id', 'New text')
      ).rejects.toThrow(NotFoundException);
    });

    it('should not change orderIndex when updating step text', async () => {
      const step1 = await service.addStep(testActivitySlot.id, 'Step 1');
      const step2 = await service.addStep(testActivitySlot.id, 'Step 2');
      const step3 = await service.addStep(testActivitySlot.id, 'Step 3');

      await service.updateStep(step2.id, 'Updated Step 2');

      const steps = await service.getStepsBySlot(testActivitySlot.id);
      expect(steps[0].id).toBe(step1.id);
      expect(steps[1].id).toBe(step2.id);
      expect(steps[1].stepText).toBe('Updated Step 2');
      expect(steps[1].orderIndex).toBe(1);
      expect(steps[2].id).toBe(step3.id);
    });
  });
});
