import { Injectable } from '@nestjs/common';
import {
  CalendarFeedRevokedReason,
  CalendarFeedScope,
  CalendarFeedToken,
  CalendarFeedTokenStatus,
} from '@prisma/client';
import * as crypto from 'crypto';
import prisma from '../utils/prisma';

@Injectable()
export class CalendarFeedTokenService {
  private readonly tokenSecret =
    process.env.CALENDAR_FEED_TOKEN_SECRET || process.env.JWT_SECRET || 'calendar-feed-secret';

  private resolveOwner(ownerId: string, authTier: string) {
    return authTier === 'DEN_CHIEF'
      ? { denChiefId: ownerId, volunteerId: null }
      : { volunteerId: ownerId, denChiefId: null };
  }

  private buildRawTokenFromId(tokenId: string): string {
    const signature = crypto
      .createHmac('sha256', this.tokenSecret)
      .update(tokenId)
      .digest('hex')
      .slice(0, 48);

    return `${tokenId}.${signature}`;
  }

  hashRawToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  async resolveActiveToken(rawToken: string): Promise<CalendarFeedToken | null> {
    const tokenHash = this.hashRawToken(rawToken);

    return prisma.calendarFeedToken.findFirst({
      where: {
        tokenHash,
        status: CalendarFeedTokenStatus.ACTIVE,
      },
    });
  }

  async resolveAnyToken(rawToken: string): Promise<CalendarFeedToken | null> {
    const tokenHash = this.hashRawToken(rawToken);

    return prisma.calendarFeedToken.findFirst({
      where: {
        tokenHash,
      },
    });
  }

  buildRawToken(token: Pick<CalendarFeedToken, 'id'>): string {
    return this.buildRawTokenFromId(token.id);
  }

  private async createScopedToken(
    owner: { volunteerId: string | null; denChiefId: string | null },
    scopeType: CalendarFeedScope,
    denId: string | null,
  ) {
    const pendingHash = crypto.randomBytes(32).toString('hex');

    const created = await prisma.calendarFeedToken.create({
      data: {
        volunteerId: owner.volunteerId,
        denChiefId: owner.denChiefId,
        scopeType,
        denId,
        tokenHash: pendingHash,
        tokenPrefix: 'pending',
        status: CalendarFeedTokenStatus.ACTIVE,
      },
    });

    const rawToken = this.buildRawTokenFromId(created.id);
    const tokenHash = this.hashRawToken(rawToken);

    await prisma.calendarFeedToken.update({
      where: { id: created.id },
      data: {
        tokenHash,
        tokenPrefix: created.id.slice(0, 12),
      },
    });

    return {
      rawToken,
      token: {
        ...created,
        tokenHash,
        tokenPrefix: created.id.slice(0, 12),
      },
    };
  }

  async getOrCreatePackToken(ownerId: string, authTier: string) {
    const owner = this.resolveOwner(ownerId, authTier);
    const existing = await prisma.calendarFeedToken.findFirst({
      where: {
        volunteerId: owner.volunteerId,
        denChiefId: owner.denChiefId,
        scopeType: CalendarFeedScope.PACK,
        status: CalendarFeedTokenStatus.ACTIVE,
      },
    });

    if (existing) {
      return { rawToken: this.buildRawToken(existing), token: existing, created: false };
    }

    const created = await this.createScopedToken(owner, CalendarFeedScope.PACK, null);
    return { ...created, created: true };
  }

  async getOrCreateDenToken(ownerId: string, authTier: string, denId: string) {
    const owner = this.resolveOwner(ownerId, authTier);
    const existing = await prisma.calendarFeedToken.findFirst({
      where: {
        volunteerId: owner.volunteerId,
        denChiefId: owner.denChiefId,
        scopeType: CalendarFeedScope.DEN,
        denId,
        status: CalendarFeedTokenStatus.ACTIVE,
      },
    });

    if (existing) {
      return { rawToken: this.buildRawToken(existing), token: existing, created: false };
    }

    const created = await this.createScopedToken(owner, CalendarFeedScope.DEN, denId);
    return { ...created, created: true };
  }

  async revokeTokenById(tokenId: string, reason: CalendarFeedRevokedReason) {
    await prisma.calendarFeedToken.updateMany({
      where: {
        id: tokenId,
        status: CalendarFeedTokenStatus.ACTIVE,
      },
      data: {
        status: CalendarFeedTokenStatus.REVOKED,
        revokedReason: reason,
        revokedAt: new Date(),
      },
    });
  }

  async revokeScopeToken(
    ownerId: string,
    authTier: string,
    scopeType: CalendarFeedScope,
    denId: string | null,
    reason: CalendarFeedRevokedReason,
  ) {
    const owner = this.resolveOwner(ownerId, authTier);
    await prisma.calendarFeedToken.updateMany({
      where: {
        volunteerId: owner.volunteerId,
        denChiefId: owner.denChiefId,
        scopeType,
        denId,
        status: CalendarFeedTokenStatus.ACTIVE,
      },
      data: {
        status: CalendarFeedTokenStatus.REVOKED,
        revokedReason: reason,
        revokedAt: new Date(),
      },
    });
  }

  async revokeAllForVolunteer(volunteerId: string, reason: CalendarFeedRevokedReason) {
    await prisma.calendarFeedToken.updateMany({
      where: {
        volunteerId,
        status: CalendarFeedTokenStatus.ACTIVE,
      },
      data: {
        status: CalendarFeedTokenStatus.REVOKED,
        revokedReason: reason,
        revokedAt: new Date(),
      },
    });
  }

  async revokeAllForDenChief(denChiefId: string, reason: CalendarFeedRevokedReason) {
    await prisma.calendarFeedToken.updateMany({
      where: {
        denChiefId,
        status: CalendarFeedTokenStatus.ACTIVE,
      },
      data: {
        status: CalendarFeedTokenStatus.REVOKED,
        revokedReason: reason,
        revokedAt: new Date(),
      },
    });
  }
}
