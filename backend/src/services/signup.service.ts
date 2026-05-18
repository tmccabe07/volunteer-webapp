/**
 * SignupService
 * 
 * Handles volunteer signups for event activity slots with capacity checking
 * and withdrawal logic per User Story 4
 */

import { Injectable } from '@nestjs/common';
import prisma from '../utils/prisma';

@Injectable()
export class SignupService {
  /**
   * Sign up a volunteer for an activity slot
   * Checks capacity constraints before allowing signup
   */
  async signupForActivity(
    volunteerId: string,
    activitySlotId: string,
  ) {
    // Check if activity slot exists and event is not past
    const activitySlot = await prisma.activitySlot.findUnique({
      where: { id: activitySlotId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            isComplete: true,
            deletedAt: true,
          },
        },
        activityType: {
          select: {
            name: true,
          },
        },
        signups: {
          where: { withdrawn: false },
          select: {
            id: true,
            volunteerId: true,
          },
        },
      },
    });

    if (!activitySlot || activitySlot.event.deletedAt) {
      throw new Error('Activity slot not found');
    }

    // Check if event is in the past
    if (new Date(activitySlot.event.eventDate) < new Date()) {
      throw new Error('Cannot sign up for past events');
    }

    // Check if event is complete
    if (activitySlot.event.isComplete) {
      throw new Error('Cannot sign up for completed events');
    }

    // Check if user already signed up
    const existingSignup = await prisma.signup.findFirst({
      where: {
        volunteerId,
        activitySlotId,
      },
    });

    if (existingSignup && !existingSignup.withdrawn) {
      throw new Error('Already signed up for this activity');
    }

    // Check capacity if set
    if (activitySlot.capacity !== null) {
      const currentSignupCount = activitySlot.signups.length;
      if (currentSignupCount >= activitySlot.capacity) {
        throw new Error('Activity slot is at capacity');
      }
    }

    // If previous signup was withdrawn, reactivate it
    if (existingSignup && existingSignup.withdrawn) {
      const reactivatedSignup = await prisma.signup.update({
        where: { id: existingSignup.id },
        data: {
          withdrawn: false,
          withdrawnAt: null,
        },
      });
      return reactivatedSignup;
    }

    // Create new signup
    const signup = await prisma.signup.create({
      data: {
        volunteerId,
        activitySlotId,
        withdrawn: false,
      },
    });

    return signup;
  }

  /**
   * Withdraw a volunteer from an activity slot
   * Can be reversed by signing up again
   */
  async withdrawFromActivity(
    volunteerId: string,
    activitySlotId: string,
  ) {
    // Find signup
    const signup = await prisma.signup.findFirst({
      where: {
        volunteerId,
        activitySlotId,
        withdrawn: false,
      },
    });

    if (!signup) {
      throw new Error('Signup not found or already withdrawn');
    }

    // Mark as withdrawn
    const updatedSignup = await prisma.signup.update({
      where: { id: signup.id },
      data: {
        withdrawn: true,
        withdrawnAt: new Date(),
      },
    });

    return updatedSignup;
  }

  /**
   * Get volunteer's signups
   */
  async getVolunteerSignups(volunteerId: string, includeWithdrawn: boolean = false) {
    const where: any = { volunteerId };
    
    if (!includeWithdrawn) {
      where.withdrawn = false;
    }

    const signups = await prisma.signup.findMany({
      where,
      include: {
        activitySlot: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                eventDate: true,
                location: true,
                isComplete: true,
              },
            },
            activityType: {
              select: {
                name: true,
                pointValue: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return signups;
  }

  /**
   * Get signups for an activity slot (for organizers)
   */
  async getActivitySlotSignups(activitySlotId: string) {
    const signups = await prisma.signup.findMany({
      where: { activitySlotId },
      include: {
        volunteer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return signups;
  }
}
