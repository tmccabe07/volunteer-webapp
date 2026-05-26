import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthTier,
  Prisma,
  PromptCategory,
  PromptStatus,
  type DenEvent,
} from '@prisma/client';
import prisma from '../../utils/prisma';
import { NotificationService } from '../notification.service';
import type { GeneratePromptsDto } from '../../models/hours-prompt/generate-prompts.dto';

interface PromptFilters {
  childScoutId?: string;
  status?: PromptStatus;
  category?: PromptCategory;
}

@Injectable()
export class ScoutbookPromptService {
  constructor(private readonly notificationService: NotificationService) {}

  private async ensureDenEvent(eventId: string): Promise<DenEvent> {
    const event = await prisma.event.findUnique({
      where: { id: eventId, deletedAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        eventDate: true,
        eventEndDate: true,
        eventTime: true,
        endTime: true,
        fullDay: true,
        location: true,
        plannedHourActivities: true,
        createdById: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const existingDenEvent = await prisma.denEvent.findUnique({
      where: { id: eventId },
    });

    if (existingDenEvent) {
      return existingDenEvent;
    }

    return prisma.denEvent.create({
      data: {
        id: event.id,
        title: event.title,
        description: event.description,
        eventDate: event.eventDate,
        eventEndDate: event.eventEndDate,
        eventTime: event.eventTime,
        endTime: event.endTime,
        fullDay: event.fullDay,
        location: event.location,
        hourPromptDefaults: event.plannedHourActivities
          ? (event.plannedHourActivities as Prisma.InputJsonValue)
          : Prisma.DbNull,
        denId: null,
        createdById: event.createdById,
      },
    });
  }

  private buildDefaultCategoryData(
    category: PromptCategory,
    event: DenEvent,
    categoryData: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> {
    const base = categoryData || {};

    if (category === PromptCategory.CAMPING) {
      return {
        nights: typeof base.nights === 'number' ? base.nights : 1,
        location:
          typeof base.location === 'string' && base.location.trim().length > 0
            ? base.location
            : event.location || 'Campout Location',
      };
    }

    if (category === PromptCategory.HIKING) {
      return {
        miles: typeof base.miles === 'number' ? base.miles : 1,
        trailName:
          typeof base.trailName === 'string' && base.trailName.trim().length > 0
            ? base.trailName
            : event.title,
      };
    }

    return {
      hours: typeof base.hours === 'number' ? base.hours : 1,
      projectName:
        typeof base.projectName === 'string' && base.projectName.trim().length > 0
          ? base.projectName
          : event.title,
    };
  }

  private buildMessage(category: PromptCategory, categoryData: Record<string, unknown>): string {
    if (category === PromptCategory.REQUIREMENT) {
      const adventureName = String(categoryData.adventureName || 'Adventure');
      const requirementText = String(categoryData.requirementText || 'Requirement update');
      return `Suggested Scoutbook update: ${adventureName} - ${requirementText}.`;
    }

    if (category === PromptCategory.CAMPING) {
      const nights = Number(categoryData.nights || 0);
      const location = String(categoryData.location || 'your event');
      return `Suggested Scoutbook entry: ${nights} camping night${nights === 1 ? '' : 's'} at ${location}.`;
    }

    if (category === PromptCategory.HIKING) {
      const miles = Number(categoryData.miles || 0);
      const trailName = String(categoryData.trailName || 'your event');
      return `Suggested Scoutbook entry: ${miles} hiking mile${miles === 1 ? '' : 's'} for ${trailName}.`;
    }

    const hours = Number(categoryData.hours || 0);
    const projectName = String(categoryData.projectName || 'your event');
    return `Suggested Scoutbook entry: ${hours} service hour${hours === 1 ? '' : 's'} for ${projectName}.`;
  }

  private async ensurePromptAccess(promptId: string, userId: string, authTier: string) {
    const prompt = await prisma.scoutbookPrompt.findUnique({
      where: { id: promptId },
      include: {
        childScout: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }

    if (authTier === AuthTier.ADMIN || authTier === AuthTier.LEADER) {
      return prompt;
    }

    const approvedLink = await prisma.parentChildLink.findFirst({
      where: {
        parentId: userId,
        childScoutId: prompt.childScout.id,
        status: 'APPROVED',
      },
      select: { id: true },
    });

    if (!approvedLink) {
      throw new ForbiddenException('You do not have access to this prompt');
    }

    return prompt;
  }

  async generatePrompts(eventId: string, dto: GeneratePromptsDto) {
    const denEvent = await this.ensureDenEvent(eventId);
    const syncMode = dto.syncMode || 'ADD_ONLY';

    const attendeeRows = await prisma.childAttendance.findMany({
      where: {
        eventId,
      },
      select: {
        childScoutId: true,
      },
    });

    const attendeeIds = new Set(attendeeRows.map((row) => row.childScoutId));

    const allChildIds = [
      ...new Set(dto.categoryPrompts.flatMap((prompt) => prompt.childScoutIds)),
    ];

    const children = await prisma.childScout.findMany({
      where: {
        id: { in: allChildIds },
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (children.length !== allChildIds.length) {
      const foundIds = new Set(children.map((child) => child.id));
      const missingIds = allChildIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(`Invalid childScoutIds: ${missingIds.join(', ')}`);
    }

    const invalidAttendee = allChildIds.find((id) => attendeeRows.length > 0 && !attendeeIds.has(id));
    if (invalidAttendee) {
      throw new BadRequestException(
        'Prompts can only be generated for children with attendance records for this event',
      );
    }

    const recordsToCreate: Array<{
      eventId: string;
      childScoutId: string;
      category: PromptCategory;
      categoryData: Prisma.InputJsonValue;
    }> = [];

    for (const categoryPrompt of dto.categoryPrompts) {
      const categoryData = this.buildDefaultCategoryData(
        categoryPrompt.category,
        denEvent,
        categoryPrompt.categoryData as Record<string, unknown> | undefined,
      );

      for (const childScoutId of [...new Set(categoryPrompt.childScoutIds)]) {
        recordsToCreate.push({
          eventId,
          childScoutId,
          category: categoryPrompt.category,
          categoryData: categoryData as Prisma.InputJsonValue,
        });
      }
    }

    const categories = [...new Set(dto.categoryPrompts.map((prompt) => prompt.category))];

    if (syncMode === 'SYNC_REMOVE' && categories.length > 0) {
      await prisma.scoutbookPrompt.deleteMany({
        where: {
          eventId,
          category: { in: categories },
          status: {
            in: [PromptStatus.PENDING, PromptStatus.SENT],
          },
        },
      });
    }

    if (syncMode === 'ADD_ONLY' && recordsToCreate.length > 0) {
      const existing = await prisma.scoutbookPrompt.findMany({
        where: {
          eventId,
          status: {
            in: [PromptStatus.PENDING, PromptStatus.SENT],
          },
          OR: recordsToCreate.map((record) => ({
            childScoutId: record.childScoutId,
            category: record.category,
          })),
        },
        select: {
          childScoutId: true,
          category: true,
        },
      });

      const existingKeys = new Set(existing.map((prompt) => `${prompt.childScoutId}:${prompt.category}`));
      const deduped = recordsToCreate.filter(
        (record) => !existingKeys.has(`${record.childScoutId}:${record.category}`),
      );
      recordsToCreate.length = 0;
      recordsToCreate.push(...deduped);
    }

    if (recordsToCreate.length === 0) {
      return {
        eventId,
        promptsGenerated: 0,
        prompts: [],
      };
    }

    await prisma.scoutbookPrompt.createMany({
      data: recordsToCreate,
    });

    const prompts = await prisma.scoutbookPrompt.findMany({
      where: {
        eventId,
      },
      orderBy: {
        generatedAt: 'desc',
      },
      take: recordsToCreate.length,
    });

    for (const prompt of prompts) {
      const child = children.find((item) => item.id === prompt.childScoutId);
      if (!child) {
        continue;
      }

      const parentLinks = await prisma.parentChildLink.findMany({
        where: {
          childScoutId: child.id,
          status: 'APPROVED',
        },
        select: {
          parentId: true,
        },
      });

      for (const link of parentLinks) {
        await this.notificationService.createNotification({
          volunteerId: link.parentId,
          type: 'EVENT_REMINDER',
          message: `Scoutbook prompt generated for ${child.firstName} ${child.lastName}: ${this.buildMessage(prompt.category, prompt.categoryData as Record<string, unknown>)}`,
          link: `/parent/scoutbook-prompts`,
        });
      }
    }

    return {
      eventId,
      promptsGenerated: prompts.length,
      prompts: prompts.map((prompt) => ({
        id: prompt.id,
        childScoutId: prompt.childScoutId,
        category: prompt.category,
        categoryData: prompt.categoryData,
        status: prompt.status,
      })),
    };
  }

  async listPrompts(userId: string, authTier: string, filters: PromptFilters) {
    if (authTier === AuthTier.PARENT) {
      const links = await prisma.parentChildLink.findMany({
        where: {
          parentId: userId,
          status: 'APPROVED',
        },
        select: {
          childScoutId: true,
        },
      });

      const childScoutIds = links.map((link) => link.childScoutId);

      if (filters.childScoutId && !childScoutIds.includes(filters.childScoutId)) {
        throw new ForbiddenException('You can only view prompts for linked children');
      }

      if (childScoutIds.length === 0) {
        return { data: [] };
      }

      const prompts = await prisma.scoutbookPrompt.findMany({
        where: {
          childScoutId: filters.childScoutId || { in: childScoutIds },
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.category ? { category: filters.category } : {}),
        },
        include: {
          childScout: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              eventDate: true,
            },
          },
        },
        orderBy: { generatedAt: 'desc' },
      });

      return {
        data: prompts.map((prompt) => ({
          id: prompt.id,
          childScout: {
            id: prompt.childScout.id,
            name: `${prompt.childScout.firstName} ${prompt.childScout.lastName}`,
          },
          event: {
            id: prompt.event.id,
            title: prompt.event.title,
            eventDate: prompt.event.eventDate.toISOString(),
          },
          category: prompt.category,
          categoryData: prompt.categoryData,
          message: this.buildMessage(prompt.category, prompt.categoryData as Record<string, unknown>),
          status: prompt.status,
          generatedAt: prompt.generatedAt.toISOString(),
          sentAt: prompt.sentAt?.toISOString(),
        })),
      };
    }

    const prompts = await prisma.scoutbookPrompt.findMany({
      where: {
        ...(filters.childScoutId ? { childScoutId: filters.childScoutId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.category ? { category: filters.category } : {}),
      },
      include: {
        childScout: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            eventDate: true,
          },
        },
      },
      orderBy: { generatedAt: 'desc' },
    });

    return {
      data: prompts.map((prompt) => ({
        id: prompt.id,
        childScout: {
          id: prompt.childScout.id,
          name: `${prompt.childScout.firstName} ${prompt.childScout.lastName}`,
        },
        event: {
          id: prompt.event.id,
          title: prompt.event.title,
          eventDate: prompt.event.eventDate.toISOString(),
        },
        category: prompt.category,
        categoryData: prompt.categoryData,
        message: this.buildMessage(prompt.category, prompt.categoryData as Record<string, unknown>),
        status: prompt.status,
        generatedAt: prompt.generatedAt.toISOString(),
        sentAt: prompt.sentAt?.toISOString(),
      })),
    };
  }

  async acknowledgePrompt(promptId: string, userId: string, authTier: string) {
    await this.ensurePromptAccess(promptId, userId, authTier);

    const updated = await prisma.scoutbookPrompt.update({
      where: { id: promptId },
      data: {
        status: PromptStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        acknowledgedAt: true,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      acknowledgedAt: updated.acknowledgedAt?.toISOString(),
    };
  }

  async dismissPrompt(promptId: string, userId: string, authTier: string) {
    await this.ensurePromptAccess(promptId, userId, authTier);

    const updated = await prisma.scoutbookPrompt.update({
      where: { id: promptId },
      data: {
        status: PromptStatus.DISMISSED,
        dismissedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        dismissedAt: true,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      dismissedAt: updated.dismissedAt?.toISOString(),
    };
  }

  async scheduleReminderNotifications(daysOld = 7) {
    const threshold = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const prompts = await prisma.scoutbookPrompt.findMany({
      where: {
        status: {
          in: [PromptStatus.PENDING, PromptStatus.SENT],
        },
        generatedAt: {
          lte: threshold,
        },
      },
      include: {
        childScout: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    for (const prompt of prompts) {
      const links = await prisma.parentChildLink.findMany({
        where: {
          childScoutId: prompt.childScoutId,
          status: 'APPROVED',
        },
        select: {
          parentId: true,
        },
      });

      for (const link of links) {
        await this.notificationService.createNotification({
          volunteerId: link.parentId,
          type: 'EVENT_REMINDER',
          message: `Reminder: log Scoutbook ${prompt.category.toLowerCase()} hours for ${prompt.childScout.firstName} ${prompt.childScout.lastName}.`,
          link: '/parent/scoutbook-prompts',
        });
      }

      await prisma.scoutbookPrompt.update({
        where: { id: prompt.id },
        data: {
          reminderSentAt: new Date(),
        },
      });
    }

    return {
      remindersScheduled: prompts.length,
    };
  }
}
