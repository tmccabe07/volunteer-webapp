import { Injectable } from '@nestjs/common';
import { EmailSendStatus, EmailRecipientStatus, EmailTemplate } from '@prisma/client';
import prisma from '../utils/prisma';
import { MailService } from './mail.service';
import type {
  EmailPreviewResponse,
  NotifySendResponse,
  PackMemberSearchResult,
  EmailLogEntry,
} from '../models/email/email.dto';

interface Recipient {
  id: string;
  email: string;
  name: string;
  type: 'volunteer' | 'denChief';
}

const EVENT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const TASK_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class EmailNotificationService {
  constructor(private readonly mailService: MailService) {}

  // ---------------------------------------------------------------------------
  // Recipient resolution
  // ---------------------------------------------------------------------------

  private async resolveEventRecipients(eventId: string): Promise<Recipient[]> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { targetDens: true },
    });
    if (!event) return [];

    const recipients: Recipient[] = [];
    const seen = new Set<string>();

    const add = (r: Recipient) => {
      if (!seen.has(r.id) && r.email) {
        seen.add(r.id);
        recipients.push(r);
      }
    };

    if (event.scopeType === 'PACK_WIDE') {
      // All PARENT volunteers with at least one APPROVED ParentChildLink
      const parents = await prisma.volunteer.findMany({
        where: {
          deletedAt: null,
          authTier: 'PARENT',
          parentChildLinks: { some: { status: 'APPROVED' } },
        },
      });
      for (const v of parents) {
        if (v.email) add({ id: v.id, email: v.email, name: v.name, type: 'volunteer' });
      }

      // All active DenChiefs
      const denChiefs = await prisma.denChief.findMany({
        where: { isActive: true, deletedAt: null },
      });
      for (const dc of denChiefs) {
        if (dc.email) add({ id: dc.id, email: dc.email, name: `${dc.firstName} ${dc.lastName}`, type: 'denChief' });
      }
    } else {
      // Den-scoped: resolve target den IDs
      const denIds = event.targetDens.map((td) => td.denId);

      // Parents of scouts currently in those dens
      const memberships = await prisma.denMembership.findMany({
        where: { denId: { in: denIds }, validTo: null },
        include: {
          childScout: {
            include: {
              parentLinks: {
                where: { status: 'APPROVED' },
                include: { parent: true },
              },
            },
          },
        },
      });
      for (const m of memberships) {
        for (const link of m.childScout.parentLinks) {
          const v = link.parent;
          if (v.email && !v.deletedAt) add({ id: v.id, email: v.email, name: v.name, type: 'volunteer' });
        }
      }

      // DenChiefs with active assignment to those dens
      const assignments = await prisma.denChiefAssignment.findMany({
        where: { denId: { in: denIds }, validTo: null },
        include: { denChief: true },
      });
      for (const a of assignments) {
        const dc = a.denChief;
        if (dc.email && dc.isActive && !dc.deletedAt) {
          add({ id: dc.id, email: dc.email, name: `${dc.firstName} ${dc.lastName}`, type: 'denChief' });
        }
      }
    }

    return recipients;
  }

  private async resolveAdditionalRecipients(ids: string[]): Promise<Recipient[]> {
    const recipients: Recipient[] = [];
    for (const id of ids) {
      const vol = await prisma.volunteer.findFirst({ where: { id, deletedAt: null } });
      if (vol && vol.email) {
        recipients.push({ id: vol.id, email: vol.email, name: vol.name, type: 'volunteer' });
        continue;
      }
      const dc = await prisma.denChief.findFirst({ where: { id, isActive: true, deletedAt: null } });
      if (dc && dc.email) {
        recipients.push({ id: dc.id, email: dc.email, name: `${dc.firstName} ${dc.lastName}`, type: 'denChief' });
      }
    }
    return recipients;
  }

  private mergeRecipients(base: Recipient[], additional: Recipient[]): Recipient[] {
    const seen = new Set(base.map((r) => r.id));
    const merged = [...base];
    for (const r of additional) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        merged.push(r);
      }
    }
    return merged;
  }

  private async resolveTaskRecipients(taskId: string): Promise<Recipient[]> {
    const taskRoles = await prisma.adminTaskToRole.findMany({
      where: { taskId },
      select: { roleId: true },
    });
    const roleIds = taskRoles.map((tr) => tr.roleId);

    const assignments = await prisma.volunteerToRole.findMany({
      where: { roleId: { in: roleIds }, removedAt: null },
      include: { volunteer: true },
    });

    const seen = new Set<string>();
    const recipients: Recipient[] = [];
    for (const a of assignments) {
      const v = a.volunteer;
      if (!seen.has(v.id) && v.email && !v.deletedAt) {
        seen.add(v.id);
        recipients.push({ id: v.id, email: v.email, name: v.name, type: 'volunteer' });
      }
    }
    return recipients;
  }

  // ---------------------------------------------------------------------------
  // Cooldown checks
  // ---------------------------------------------------------------------------

  private async getLastSend(
    templateType: EmailTemplate,
    eventId?: string,
    taskId?: string,
  ) {
    const where: Record<string, unknown> = { templateType };
    if (eventId) where.eventId = eventId;
    if (taskId) where.taskId = taskId;
    return prisma.emailLog.findFirst({ where, orderBy: { sentAt: 'desc' } });
  }

  // ---------------------------------------------------------------------------
  // HTML templates
  // ---------------------------------------------------------------------------

  private eventNotificationHtml(opts: {
    eventTitle: string;
    eventDate: string;
    eventTime?: string | null;
    location?: string | null;
    senderName: string;
    packName: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <h2 style="color:#1a365d">${opts.packName}</h2>
  <h3>Upcoming Event: ${opts.eventTitle}</h3>
  <p><strong>Date:</strong> ${opts.eventDate}</p>
  ${opts.eventTime ? `<p><strong>Time:</strong> ${opts.eventTime}</p>` : ''}
  ${opts.location ? `<p><strong>Location:</strong> ${opts.location}</p>` : ''}
  <hr/>
  <p style="color:#666;font-size:0.9em">This message was sent by ${opts.senderName} via ${opts.packName}.</p>
</body>
</html>`.trim();
  }

  private completionSummaryHtml(opts: {
    eventTitle: string;
    eventDate: string;
    senderName: string;
    packName: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <h2 style="color:#1a365d">${opts.packName}</h2>
  <h3>Event Summary: ${opts.eventTitle}</h3>
  <p>Thank you for participating in <strong>${opts.eventTitle}</strong> on ${opts.eventDate}. We hope you had a great time!</p>
  <hr/>
  <p style="color:#666;font-size:0.9em">This message was sent by ${opts.senderName} via ${opts.packName}.</p>
</body>
</html>`.trim();
  }

  private taskReminderHtml(opts: {
    taskName: string;
    dueDate: string;
    senderName: string;
    packName: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <h2 style="color:#1a365d">${opts.packName}</h2>
  <h3>Task Reminder: ${opts.taskName}</h3>
  <p>This is a reminder that the following task is overdue:</p>
  <p><strong>${opts.taskName}</strong></p>
  <p><strong>Due date:</strong> ${opts.dueDate}</p>
  <p>Please log in to the volunteer portal to complete this task.</p>
  <hr/>
  <p style="color:#666;font-size:0.9em">This message was sent by ${opts.senderName} via ${opts.packName}.</p>
</body>
</html>`.trim();
  }

  // ---------------------------------------------------------------------------
  // Send helpers
  // ---------------------------------------------------------------------------

  private async sendAndLog(opts: {
    senderId: string;
    templateType: EmailTemplate;
    eventId?: string;
    taskId?: string;
    recipients: Recipient[];
    subject: string;
    html: string;
    withinCooldownWarning?: boolean;
  }): Promise<NotifySendResponse> {
    let recipientCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const logs: Array<{
      recipientId: string;
      recipientEmail: string;
      status: EmailRecipientStatus;
      failureReason?: string;
    }> = [];

    for (const r of opts.recipients) {
      if (!r.email) {
        skippedCount++;
        logs.push({ recipientId: r.id, recipientEmail: '', status: 'SKIPPED', failureReason: 'No email address' });
        continue;
      }
      try {
        await this.mailService.send({ to: [r.email], subject: opts.subject, html: opts.html });
        recipientCount++;
        logs.push({ recipientId: r.id, recipientEmail: r.email, status: 'SENT' });
      } catch (err) {
        failedCount++;
        logs.push({
          recipientId: r.id,
          recipientEmail: r.email,
          status: 'FAILED',
          failureReason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const overallStatus: EmailSendStatus =
      failedCount === opts.recipients.length ? 'FAILED' : failedCount > 0 ? 'PARTIAL' : 'SENT';

    const emailLog = await prisma.emailLog.create({
      data: {
        senderId: opts.senderId,
        templateType: opts.templateType,
        eventId: opts.eventId ?? null,
        taskId: opts.taskId ?? null,
        recipientCount,
        skippedCount,
        failedCount,
        status: overallStatus,
        recipients: {
          create: logs.map((l) => ({
            recipientId: l.recipientId,
            recipientEmail: l.recipientEmail,
            status: l.status,
            failureReason: l.failureReason ?? null,
          })),
        },
      },
    });

    return {
      emailLogId: emailLog.id,
      recipientCount,
      skippedCount,
      failedCount,
      status: overallStatus,
      withinCooldownWarning: opts.withinCooldownWarning,
    };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async getEventEmailPreview(eventId: string): Promise<EmailPreviewResponse> {
    const recipients = await this.resolveEventRecipients(eventId);
    const lastSend = await this.getLastSend('EVENT_NOTIFICATION', eventId);
    const recentSend = lastSend
      ? {
          sentAt: lastSend.sentAt.toISOString(),
          withinCooldown: Date.now() - lastSend.sentAt.getTime() < EVENT_COOLDOWN_MS,
        }
      : null;
    return { defaultRecipientCount: recipients.length, recentSend };
  }

  async notifyEventMembers(
    eventId: string,
    senderId: string,
    additionalRecipientIds: string[] = [],
  ): Promise<NotifySendResponse> {
    const event = await prisma.event.findUnique({ where: { id: eventId, deletedAt: null } });
    if (!event) throw new Error('Event not found');

    const packConfig = await prisma.packConfig.findFirst();
    const packName = packConfig?.packName ?? 'Cub Scout Pack';
    const sender = await prisma.volunteer.findUnique({ where: { id: senderId } });
    const senderName = sender?.name ?? 'A leader';

    const base = await this.resolveEventRecipients(eventId);
    const extra = await this.resolveAdditionalRecipients(additionalRecipientIds);
    const all = this.mergeRecipients(base, extra);

    const lastSend = await this.getLastSend('EVENT_NOTIFICATION', eventId);
    const withinCooldownWarning =
      !!lastSend && Date.now() - lastSend.sentAt.getTime() < EVENT_COOLDOWN_MS;

    const eventDate = event.eventDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const html = this.eventNotificationHtml({
      eventTitle: event.title,
      eventDate,
      eventTime: event.eventTime,
      location: event.location,
      senderName,
      packName,
    });

    return this.sendAndLog({
      senderId,
      templateType: 'EVENT_NOTIFICATION',
      eventId,
      recipients: all,
      subject: `Upcoming Event: ${event.title}`,
      html,
      withinCooldownWarning,
    });
  }

  async sendCompletionSummary(
    eventId: string,
    senderId: string,
    additionalRecipientIds: string[] = [],
  ): Promise<NotifySendResponse> {
    const event = await prisma.event.findUnique({ where: { id: eventId, deletedAt: null } });
    if (!event) throw new Error('Event not found');
    if (!event.isComplete) throw new Error('EVENT_NOT_COMPLETE');

    const packConfig = await prisma.packConfig.findFirst();
    const packName = packConfig?.packName ?? 'Cub Scout Pack';
    const sender = await prisma.volunteer.findUnique({ where: { id: senderId } });
    const senderName = sender?.name ?? 'A leader';

    const base = await this.resolveEventRecipients(eventId);
    const extra = await this.resolveAdditionalRecipients(additionalRecipientIds);
    const all = this.mergeRecipients(base, extra);

    const eventDate = event.eventDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const html = this.completionSummaryHtml({ eventTitle: event.title, eventDate, senderName, packName });

    return this.sendAndLog({
      senderId,
      templateType: 'EVENT_COMPLETION_SUMMARY',
      eventId,
      recipients: all,
      subject: `Event Summary: ${event.title}`,
      html,
    });
  }

  async sendTaskReminder(taskId: string, senderId: string): Promise<NotifySendResponse> {
    const task = await prisma.adminTask.findUnique({ where: { id: taskId, deletedAt: null } });
    if (!task) throw new Error('Task not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    if (dueDate > today) throw new Error('TASK_NOT_OVERDUE');

    const lastSend = await this.getLastSend('TASK_REMINDER', undefined, taskId);
    if (lastSend && Date.now() - lastSend.sentAt.getTime() < TASK_COOLDOWN_MS) {
      throw Object.assign(new Error('COOLDOWN'), { lastSentAt: lastSend.sentAt });
    }

    const packConfig = await prisma.packConfig.findFirst();
    const packName = packConfig?.packName ?? 'Cub Scout Pack';
    const sender = await prisma.volunteer.findUnique({ where: { id: senderId } });
    const senderName = sender?.name ?? 'An admin';

    const recipients = await this.resolveTaskRecipients(taskId);
    const dueDateStr = task.dueDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const html = this.taskReminderHtml({ taskName: task.name, dueDate: dueDateStr, senderName, packName });

    return this.sendAndLog({
      senderId,
      templateType: 'TASK_REMINDER',
      taskId,
      recipients,
      subject: `Reminder: ${task.name} is overdue`,
      html,
    });
  }

  async searchPackMembers(q: string): Promise<PackMemberSearchResult[]> {
    const lq = `%${q}%`;

    const volunteers = await prisma.volunteer.findMany({
      where: {
        deletedAt: null,
        name: { contains: q },
        NOT: { email: '' },
      },
      take: 20,
    });

    const denChiefs = await prisma.denChief.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        NOT: { email: '' },
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
        ],
      },
      take: 20,
    });

    void lq;

    const results: PackMemberSearchResult[] = [
      ...volunteers.map((v) => ({
        id: v.id,
        name: v.name,
        type: 'volunteer' as const,
        email: v.email,
      })),
      ...denChiefs.map((dc) => ({
        id: dc.id,
        name: `${dc.firstName} ${dc.lastName}`,
        type: 'denChief' as const,
        email: dc.email,
      })),
    ];

    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getEventEmailLogs(eventId: string): Promise<EmailLogEntry[]> {
    const logs = await prisma.emailLog.findMany({
      where: { eventId },
      orderBy: { sentAt: 'desc' },
    });

    return Promise.all(
      logs.map(async (log) => {
        const sender = await prisma.volunteer.findUnique({ where: { id: log.senderId } });
        return {
          id: log.id,
          templateType: log.templateType,
          senderName: sender?.name ?? 'Unknown',
          recipientCount: log.recipientCount,
          skippedCount: log.skippedCount,
          failedCount: log.failedCount,
          status: log.status,
          sentAt: log.sentAt.toISOString(),
        };
      }),
    );
  }
}
