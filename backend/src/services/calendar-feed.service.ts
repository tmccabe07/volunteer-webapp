import { Injectable } from '@nestjs/common';
import {
  AuthTier,
  CalendarFeedAccessOutcome,
  CalendarFeedScope,
  CalendarFeedToken,
} from '@prisma/client';
import ical, { ICalAlarmType, ICalCalendarMethod } from 'ical-generator';
import prisma from '../utils/prisma';
import { CalendarFeedTokenService } from './calendar-feed-token.service';

interface FeedProjectionEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  eventDate: Date;
  eventEndDate: Date | null;
  eventTime: string | null;
  endTime: string | null;
  fullDay: boolean;
  updatedAt: Date;
}

@Injectable()
export class CalendarFeedService {
  constructor(private readonly tokenService: CalendarFeedTokenService) {}

  private startOfToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  private mergeDateAndTime(date: Date, hhmm: string | null, allDay: boolean): Date {
    if (allDay || !hhmm) {
      const atMidnight = new Date(date);
      atMidnight.setHours(0, 0, 0, 0);
      return atMidnight;
    }

    const [hours, minutes] = hhmm.split(':').map((value) => Number(value));
    const merged = new Date(date);
    merged.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
    return merged;
  }

  private buildCalendarName(scopeType: CalendarFeedScope, displayName: string): string {
    return scopeType === CalendarFeedScope.PACK
      ? `${displayName} Events`
      : `${displayName} Den Events`;
  }

  private async getUserDisplayName(): Promise<string> {
    const config = await prisma.packConfig.findFirst({
      select: {
        packName: true,
      },
    });

    return config?.packName || 'Pack';
  }

  async getAccessibleDenIds(userId: string, authTier: string): Promise<string[]> {
    if (authTier === AuthTier.ADMIN) {
      const dens = await prisma.den.findMany({
        where: { isActive: true, deletedAt: null },
        select: { id: true },
      });
      return dens.map((den) => den.id);
    }

    const [volunteer, denChief, linkedCubs] = await Promise.all([
      prisma.volunteer.findFirst({
        where: { id: userId, deletedAt: null },
        select: {
          volunteerRoles: {
            where: { removedAt: null },
            select: {
              denId: true,
            },
          },
        },
      }),
      prisma.denChief.findFirst({
        where: { id: userId, deletedAt: null, isActive: true },
        select: {
          denAssignments: {
            where: { validTo: null },
            select: {
              denId: true,
            },
          },
        },
      }),
      prisma.parentChildLink.findMany({
        where: {
          parentId: userId,
          status: 'APPROVED',
          childScout: {
            deletedAt: null,
            isActive: true,
          },
        },
        select: {
          childScout: {
            select: {
              denMemberships: {
                where: { validTo: null },
                take: 1,
                select: {
                  denId: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const denIds = new Set<string>();

    volunteer?.volunteerRoles.forEach((role) => {
      if (role.denId) {
        denIds.add(role.denId);
      }
    });

    denChief?.denAssignments.forEach((assignment) => {
      if (assignment.denId) {
        denIds.add(assignment.denId);
      }
    });

    linkedCubs.forEach((link) => {
      const denId = link.childScout.denMemberships[0]?.denId;
      if (denId) {
        denIds.add(denId);
      }
    });

    return Array.from(denIds);
  }

  async getOrCreateFeedDescriptors(userId: string, authTier: string, baseUrl: string) {
    const [packName, accessibleDenIds] = await Promise.all([
      this.getUserDisplayName(),
      this.getAccessibleDenIds(userId, authTier),
    ]);

    const descriptors: Array<{
      scopeType: CalendarFeedScope;
      denId: string | null;
      displayName: string;
      feedUrl: string;
      isActive: boolean;
      lastAccessedAt: string | null;
    }> = [];

    const owner = authTier === AuthTier.DEN_CHIEF
      ? { denChiefId: userId, volunteerId: null }
      : { volunteerId: userId, denChiefId: null };

    const packToken = await this.tokenService.getOrCreatePackToken(userId, authTier);
    descriptors.push({
      scopeType: CalendarFeedScope.PACK,
      denId: null,
      displayName: packName,
      feedUrl: `${baseUrl}/api/calendar/feeds/${packToken.rawToken}.ics`,
      isActive: true,
      lastAccessedAt: packToken.token.lastAccessedAt?.toISOString() ?? null,
    });

    const dens = await prisma.den.findMany({
      where: {
        id: { in: accessibleDenIds },
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: [{ name: 'asc' }],
    });

    for (const den of dens) {
      const denToken = await this.tokenService.getOrCreateDenToken(userId, authTier, den.id);
      descriptors.push({
        scopeType: CalendarFeedScope.DEN,
        denId: den.id,
        displayName: den.name,
        feedUrl: `${baseUrl}/api/calendar/feeds/${denToken.rawToken}.ics`,
        isActive: true,
        lastAccessedAt: denToken.token.lastAccessedAt?.toISOString() ?? null,
      });
    }

    // Revoke stale den tokens that no longer belong to accessible dens.
    await prisma.calendarFeedToken.updateMany({
      where: {
        volunteerId: owner.volunteerId,
        denChiefId: owner.denChiefId,
        scopeType: CalendarFeedScope.DEN,
        status: 'ACTIVE',
        denId: {
          notIn: accessibleDenIds.length > 0 ? accessibleDenIds : ['__none__'],
        },
      },
      data: {
        status: 'REVOKED',
        revokedReason: 'ACCESS_REMOVED',
        revokedAt: new Date(),
      },
    });

    return descriptors;
  }

  private async getFeedEvents(token: CalendarFeedToken): Promise<FeedProjectionEvent[]> {
    const whereBase = {
      deletedAt: null,
      eventDate: {
        gte: this.startOfToday(),
      },
    };

    if (token.scopeType === CalendarFeedScope.PACK) {
      return prisma.event.findMany({
        where: {
          ...whereBase,
          scopeType: 'PACK_WIDE',
        },
        orderBy: [{ eventDate: 'asc' }, { eventTime: 'asc' }],
        select: {
          id: true,
          title: true,
          description: true,
          location: true,
          eventDate: true,
          eventEndDate: true,
          eventTime: true,
          endTime: true,
          fullDay: true,
          updatedAt: true,
        },
      });
    }

    return prisma.event.findMany({
      where: {
        ...whereBase,
        scopeType: 'DEN',
        targetDens: {
          some: {
            denId: token.denId || '',
          },
        },
      },
      orderBy: [{ eventDate: 'asc' }, { eventTime: 'asc' }],
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        eventDate: true,
        eventEndDate: true,
        eventTime: true,
        endTime: true,
        fullDay: true,
        updatedAt: true,
      },
    });
  }

  private createIcsContent(events: FeedProjectionEvent[], scopeType: CalendarFeedScope, displayName: string): string {
    const calendar = ical({
      name: this.buildCalendarName(scopeType, displayName),
      description: 'Volunteer webapp calendar subscription feed',
      timezone: 'America/New_York',
      prodId: { company: 'volunteer-webapp', product: 'calendar-feed' },
      method: ICalCalendarMethod.PUBLISH,
    });

    for (const event of events) {
      const start = this.mergeDateAndTime(event.eventDate, event.eventTime, event.fullDay);
      const inferredEnd = event.endTime
        ? this.mergeDateAndTime(event.eventDate, event.endTime, event.fullDay)
        : undefined;
      const end = event.eventEndDate || inferredEnd || start;

      const calendarEvent = calendar.createEvent({
        id: `event-${event.id}`,
        summary: event.title,
        description: event.description || undefined,
        location: event.location || undefined,
        start,
        end,
        allDay: event.fullDay,
        stamp: event.updatedAt,
      });

      // Best-effort reminder metadata for providers that honor VALARM.
      calendarEvent.createAlarm({
        type: ICalAlarmType.display,
        triggerBefore: 30 * 60,
        description: `Reminder: ${event.title}`,
      });
    }

    return calendar.toString();
  }

  async getFeedIcs(rawToken: string, requestMeta?: { ip?: string; userAgent?: string }) {
    const token = await this.tokenService.resolveActiveToken(rawToken);

    if (!token) {
      const maybeRevoked = await this.tokenService.resolveAnyToken(rawToken);
      await prisma.feedAccessAudit.create({
        data: {
          tokenId: maybeRevoked?.id || null,
          outcome: maybeRevoked ? CalendarFeedAccessOutcome.REVOKED_TOKEN : CalendarFeedAccessOutcome.INVALID_TOKEN,
          requesterIpHash: requestMeta?.ip
            ? this.tokenService.hashRawToken(requestMeta.ip).slice(0, 64)
            : null,
          userAgent: requestMeta?.userAgent?.slice(0, 512) || null,
        },
      });
      return null;
    }

    if (token.scopeType === CalendarFeedScope.DEN && token.denId) {
      const denScopeUserId = token.denChiefId || token.volunteerId;
      const denScopeTier = token.denChiefId ? AuthTier.DEN_CHIEF : AuthTier.PARENT;
      const accessibleDenIds = denScopeUserId
        ? await this.getAccessibleDenIds(denScopeUserId, denScopeTier)
        : [];
      if (!accessibleDenIds.includes(token.denId)) {
        await this.tokenService.revokeTokenById(token.id, 'ACCESS_REMOVED');
        await prisma.feedAccessAudit.create({
          data: {
            tokenId: token.id,
            outcome: CalendarFeedAccessOutcome.FORBIDDEN_SCOPE,
            requesterIpHash: requestMeta?.ip
              ? this.tokenService.hashRawToken(requestMeta.ip).slice(0, 64)
              : null,
            userAgent: requestMeta?.userAgent?.slice(0, 512) || null,
          },
        });
        return null;
      }
    }

    const displayName = token.scopeType === CalendarFeedScope.PACK
      ? await this.getUserDisplayName()
      : (await prisma.den.findFirst({ where: { id: token.denId || '', deletedAt: null }, select: { name: true } }))?.name ||
        'Den';

    const events = await this.getFeedEvents(token);
    const ics = this.createIcsContent(events, token.scopeType, displayName);

    await prisma.$transaction([
      prisma.calendarFeedToken.update({
        where: { id: token.id },
        data: { lastAccessedAt: new Date() },
      }),
      prisma.feedAccessAudit.create({
        data: {
          tokenId: token.id,
          outcome: CalendarFeedAccessOutcome.SUCCESS,
          requesterIpHash: requestMeta?.ip
            ? this.tokenService.hashRawToken(requestMeta.ip).slice(0, 64)
            : null,
          userAgent: requestMeta?.userAgent?.slice(0, 512) || null,
        },
      }),
    ]);

    return ics;
  }

  async regenerateToken(userId: string, authTier: string, scopeType: CalendarFeedScope, denId?: string) {
    if (scopeType === CalendarFeedScope.DEN && !denId) {
      throw new Error('denId is required for DEN regeneration');
    }

    if (scopeType === CalendarFeedScope.DEN && denId) {
      const accessibleDenIds = await this.getAccessibleDenIds(userId, authTier);
      if (!accessibleDenIds.includes(denId)) {
        throw new Error('Requested den is outside your scope');
      }
    }

    await this.tokenService.revokeScopeToken(
      userId,
      authTier,
      scopeType,
      scopeType === CalendarFeedScope.DEN ? denId || null : null,
      'USER_REGENERATED',
    );

    if (scopeType === CalendarFeedScope.PACK) {
      const packToken = await this.tokenService.getOrCreatePackToken(userId, authTier);
      return packToken.rawToken;
    }

    const denToken = await this.tokenService.getOrCreateDenToken(userId, authTier, denId!);
    return denToken.rawToken;
  }
}
