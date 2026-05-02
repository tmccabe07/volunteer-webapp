/**
 * Event Reminder Job
 * 
 * Scheduled job to send EVENT_REMINDER notifications 48 hours before events
 * Should be run periodically (e.g., every hour via cron job)
 */

import { NotificationService } from '../services/notification.service';
import { NotificationType } from '@prisma/client';
import prisma from '../utils/prisma';

const notificationService = new NotificationService();

export async function sendEventReminders() {
  console.log('[Event Reminders] Starting event reminder job...');

  try {
    // Calculate time window: 48 hours from now (with 1-hour buffer)
    const now = new Date();
    const reminderWindowStart = new Date(now.getTime() + 47 * 60 * 60 * 1000); // 47 hours from now
    const reminderWindowEnd = new Date(now.getTime() + 49 * 60 * 60 * 1000); // 49 hours from now

    // Find all events starting in ~48 hours that haven't been soft-deleted
    const upcomingEvents = await prisma.event.findMany({
      where: {
        eventDate: {
          gte: reminderWindowStart,
          lte: reminderWindowEnd,
        },
        deletedAt: null,
      },
      include: {
        activitySlots: {
          include: {
            signups: {
              where: {
                withdrawn: false,
              },
              select: {
                volunteerId: true,
              },
            },
          },
        },
      },
    });

    if (upcomingEvents.length === 0) {
      console.log('[Event Reminders] No upcoming events found in the 48-hour window');
      return { sent: 0, events: 0 };
    }

    console.log(`[Event Reminders] Found ${upcomingEvents.length} upcoming event(s)`);

    let notificationCount = 0;

    // Send notifications to all volunteers signed up for each event
    for (const event of upcomingEvents) {
      // Collect all volunteer IDs from all activity slots
      const signedUpVolunteerIds = event.activitySlots
        .flatMap(slot => slot.signups.map(s => s.volunteerId))
        .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates

      if (signedUpVolunteerIds.length === 0) {
        console.log(`[Event Reminders] No signups for event: ${event.title}`);
        continue;
      }

      // Format event date/time
      const eventDate = new Date(event.eventDate);
      const dateStr = eventDate.toLocaleDateString();
      const timeStr = event.eventTime || 'TBD';

      const message = `Reminder: ${event.title} is tomorrow at ${timeStr} (${dateStr}). Location: ${event.location || 'TBD'}`;

      // Send notification to each signed-up volunteer
      for (const volunteerId of signedUpVolunteerIds) {
        try {
          await notificationService.createNotification({
            volunteerId,
            type: NotificationType.EVENT_REMINDER,
            message,
          });
          notificationCount++;
        } catch (error) {
          console.error(`[Event Reminders] Failed to send notification to volunteer ${volunteerId}:`, error);
        }
      }

      console.log(`[Event Reminders] Sent ${signedUpVolunteerIds.length} reminder(s) for: ${event.title}`);
    }

    console.log(`[Event Reminders] Job complete. Sent ${notificationCount} notification(s) for ${upcomingEvents.length} event(s)`);
    
    return {
      sent: notificationCount,
      events: upcomingEvents.length,
    };
  } catch (error) {
    console.error('[Event Reminders] Job failed:', error);
    throw error;
  }
}

/**
 * CLI entry point for running the job manually
 * Usage: ts-node backend/src/jobs/event-reminders.ts
 */
if (require.main === module) {
  sendEventReminders()
    .then((result) => {
      console.log(`Event reminders sent successfully: ${JSON.stringify(result)}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Event reminder job failed:', error);
      process.exit(1);
    });
}
