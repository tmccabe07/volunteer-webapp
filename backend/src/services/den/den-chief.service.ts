import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import prisma from '../../utils/prisma';
import { CreateDenChiefDto } from '../../models/den-chief/create-den-chief.dto';
import { AssignDenChiefDto } from '../../models/den-chief/assign-den-chief.dto';
import { CalendarFeedTokenService } from '../calendar-feed-token.service';
import { CalendarFeedRevokedReason, CalendarFeedScope } from '@prisma/client';

@Injectable()
export class DenChiefService {
  private readonly BCRYPT_ROUNDS = 12;

  constructor(private readonly calendarFeedTokenService: CalendarFeedTokenService) {}

  async createDenChief(data: CreateDenChiefDto) {
    const existing = await prisma.denChief.findFirst({
      where: {
        OR: [{ email: data.email }, ...(data.scoutbookId ? [{ scoutbookId: data.scoutbookId }] : [])],
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Den Chief with this email or scoutbookId already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, this.BCRYPT_ROUNDS);

    const denChief = await prisma.denChief.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash,
        scoutbookId: data.scoutbookId ?? null,
      },
      include: {
        denAssignments: {
          where: { validTo: null },
          include: { den: { select: { id: true, name: true, denNumber: true } } },
        },
      },
    });

    return this.toResponse(denChief);
  }

  async listDenChiefs() {
    const denChiefs = await prisma.denChief.findMany({
      where: { deletedAt: null },
      include: {
        denAssignments: {
          where: { validTo: null },
          include: { den: { select: { id: true, name: true, denNumber: true } } },
          orderBy: [{ validFrom: 'desc' }],
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return denChiefs.map((d) => this.toResponse(d));
  }

  async assignDen(denChiefId: string, data: AssignDenChiefDto, assignedBy: string) {
    const denChief = await prisma.denChief.findFirst({
      where: { id: denChiefId, deletedAt: null },
      select: { id: true },
    });
    if (!denChief) {
      throw new NotFoundException('Den Chief not found');
    }

    const den = await prisma.den.findFirst({
      where: { id: data.denId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!den) {
      throw new BadRequestException('Den not found or inactive');
    }

    const validFrom = data.validFrom ?? new Date();
    const validTo = data.validTo ?? null;

    const overlap = await prisma.denChiefAssignment.findFirst({
      where: {
        denChiefId,
        denId: data.denId,
        validTo: null,
      },
      select: { id: true },
    });

    if (overlap) {
      throw new ConflictException('Den Chief already has an active assignment for this den');
    }

    const assignment = await prisma.denChiefAssignment.create({
      data: {
        denChiefId,
        denId: data.denId,
        validFrom,
        validTo,
        assignedBy,
      },
      include: {
        den: { select: { id: true, name: true, denNumber: true } },
      },
    });

    return {
      id: assignment.id,
      denId: assignment.denId,
      denName: assignment.den.name,
      denNumber: assignment.den.denNumber,
      validFrom: assignment.validFrom.toISOString(),
      validTo: assignment.validTo ? assignment.validTo.toISOString() : null,
    };
  }

  async removeAssignment(denChiefId: string, assignmentId: string) {
    const assignment = await prisma.denChiefAssignment.findFirst({
      where: { id: assignmentId, denChiefId },
      select: { id: true, validTo: true, denId: true },
    });

    if (!assignment) {
      throw new NotFoundException('Den Chief assignment not found');
    }

    if (assignment.validTo) {
      throw new BadRequestException('Assignment is already inactive');
    }

    await prisma.denChiefAssignment.update({
      where: { id: assignmentId },
      data: { validTo: new Date() },
    });

    await this.calendarFeedTokenService.revokeScopeToken(
      denChiefId,
      'DEN_CHIEF',
      CalendarFeedScope.DEN,
      assignment.denId,
      CalendarFeedRevokedReason.ACCESS_REMOVED,
    );
  }

  private toResponse(denChief: any) {
    return {
      id: denChief.id,
      firstName: denChief.firstName,
      lastName: denChief.lastName,
      email: denChief.email,
      scoutbookId: denChief.scoutbookId,
      isActive: denChief.isActive,
      assignments: (denChief.denAssignments || []).map((assignment: any) => ({
        id: assignment.id,
        denId: assignment.denId,
        denName: assignment.den.name,
        denNumber: assignment.den.denNumber,
        validFrom: assignment.validFrom.toISOString(),
        validTo: assignment.validTo ? assignment.validTo.toISOString() : null,
      })),
    };
  }
}
