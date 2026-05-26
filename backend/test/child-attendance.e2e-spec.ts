import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import {
  setupTests,
  teardownTests,
  createTestVolunteer,
  prisma,
} from '../src/test/test-utils';
import * as bcrypt from 'bcrypt';
import { AuthTier, RankLevel, AttendanceStatus, AdventureType } from '@prisma/client';

/**
 * Contract tests for Child Attendance API (User Story 1)
 * 
 * Tests:
 * - T048: PATCH /api/events/:id/child-attendance (record attendance)
 * - T049: GET /api/events/:id/child-attendance (get attendance records)
 * 
 * Following TDD approach: these tests should FAIL until implementation is complete
 */
describe('Child Attendance API (e2e)', () => {
  let app: INestApplication;
  let adminCookies: string[];
  let leaderCookies: string[];
  let parentCookies: string[];

  beforeAll(async () => {
    await setupTests();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await teardownTests();
    await app.close();
  });

  beforeEach(async () => {
    // Create test users with different tiers
    const password = 'Test123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await createTestVolunteer({
      email: 'admin@test.com',
      passwordHash,
      name: 'Admin User',
      authTier: AuthTier.ADMIN,
    });

    const leader = await createTestVolunteer({
      email: 'leader@test.com',
      passwordHash,
      name: 'Den Leader',
      authTier: AuthTier.LEADER,
    });

    const parent = await createTestVolunteer({
      email: 'parent@test.com',
      passwordHash,
      name: 'Parent User',
      authTier: AuthTier.PARENT,
    });

    // Login to get cookies
    adminCookies = await loginVolunteer('admin@test.com', password);
    leaderCookies = await loginVolunteer('leader@test.com', password);
    parentCookies = await loginVolunteer('parent@test.com', password);
  });

  afterEach(async () => {
    // Clean up in dependency order
    await prisma.requirementProgress.deleteMany();
    await prisma.childAttendance.deleteMany();
    await prisma.denEvent.deleteMany();
    await prisma.taskCompletion.deleteMany();
    await prisma.adminTaskToRole.deleteMany();
    await prisma.adminTask.deleteMany();
    await prisma.signup.deleteMany();
    await prisma.activitySlot.deleteMany();
    await prisma.event.deleteMany();
    await prisma.denMembership.deleteMany();
    await prisma.parentChildLink.deleteMany();
    await prisma.childScout.deleteMany();
    await prisma.den.deleteMany();
    await prisma.requirement.deleteMany();
    await prisma.adventure.deleteMany();
    await prisma.rank.deleteMany();
    await prisma.volunteerToRole.deleteMany();
    await prisma.volunteerPointBalance.deleteMany();
    await prisma.pointEvent.deleteMany();
    await prisma.childRank.deleteMany();
    await prisma.volunteer.deleteMany();
  });

  /**
   * Helper function to login and get cookies
   */
  async function loginVolunteer(email: string, password: string): Promise<string[]> {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });
    
    return loginRes.headers['set-cookie'];
  }

  // ====================================================================
  // T048: Contract test for PATCH /events/:id/child-attendance
  // ====================================================================
  describe('PATCH /api/events/:id/child-attendance', () => {
    let testEvent: any;
    let testDen: any;
    let testChildren: any[];
    let testRequirements: any[];

    beforeEach(async () => {
      // Create rank and adventure with requirements
      const rank = await prisma.rank.create({
        data: {
          rankLevel: RankLevel.WOLF,
          displayName: 'Wolf',
          displayOrder: 3,
          requiredAdventureCount: 6,
          electiveAdventureCount: 1,
        },
      });

      const adventure = await prisma.adventure.create({
        data: {
          rankId: rank.id,
          name: 'Call of the Wild',
          classification: AdventureType.REQUIRED,
          displayOrder: 1,
          catalogYear: '2024',
          isActive: true,
        },
      });

      testRequirements = await Promise.all([
        prisma.requirement.create({
          data: {
            adventureId: adventure.id,
            displayOrder: 1,
            requirementText: 'Learn outdoor skills',
          },
        }),
        prisma.requirement.create({
          data: {
            adventureId: adventure.id,
            displayOrder: 2,
            requirementText: 'Practice knot tying',
          },
        }),
      ]);

      // Create den
      testDen = await prisma.den.create({
        data: {
          name: 'Wolf Den 1',
          denNumber: 40,
          rankLevel: RankLevel.WOLF,
          isActive: true,
        },
      });

      // Create children and assign to den
      testChildren = await Promise.all([
        prisma.childScout.create({
          data: {
            firstName: 'Child1',
            lastName: 'Test',
            currentRank: RankLevel.WOLF,
            isActive: true,
            denMemberships: {
              create: {
                denNumber: testDen.denNumber,
                denId: testDen.id,
                validFrom: new Date(),
              },
            },
          },
        }),
        prisma.childScout.create({
          data: {
            firstName: 'Child2',
            lastName: 'Test',
            currentRank: RankLevel.WOLF,
            isActive: true,
            denMemberships: {
              create: {
                denNumber: testDen.denNumber,
                denId: testDen.id,
                validFrom: new Date(),
              },
            },
          },
        }),
      ]);

      // Create event
      testEvent = await prisma.event.create({
        data: {
          title: 'Den Meeting',
          description: 'Weekly den meeting',
          eventDate: new Date('2026-06-01T18:00:00Z'),
          duration: 90,
          location: 'Community Center',
          needsVolunteers: false,
          status: 'ACTIVE',
        },
      });

      // Create den event link
      await prisma.denEvent.create({
        data: {
          eventId: testEvent.id,
          denNumber: testDen.denNumber,
          denId: testDen.id,
        },
      });
    });

    it('should record attendance for multiple children as admin', async () => {
      const attendanceDto = {
        attendance: [
          {
            childScoutId: testChildren[0].id,
            attendanceStatus: AttendanceStatus.PRESENT,
            notes: 'Great participation',
          },
          {
            childScoutId: testChildren[1].id,
            attendanceStatus: AttendanceStatus.ABSENT,
          },
        ],
      };

      return request(app.getHttpServer())
        .patch(`/api/events/${testEvent.id}/child-attendance`)
        .set('Cookie', adminCookies)
        .send(attendanceDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.recorded).toBe(2);
          expect(res.body.attendance).toHaveLength(2);
        });
    });

    it('should record attendance with covered requirements', async () => {
      const attendanceDto = {
        attendance: [
          {
            childScoutId: testChildren[0].id,
            attendanceStatus: AttendanceStatus.PRESENT,
            coveredRequirementIds: [testRequirements[0].id, testRequirements[1].id],
          },
        ],
      };

      return request(app.getHttpServer())
        .patch(`/api/events/${testEvent.id}/child-attendance`)
        .set('Cookie', adminCookies)
        .send(attendanceDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.attendance[0].coveredRequirements).toHaveLength(2);
        });
    });

    it('should update existing attendance record', async () => {
      // Create initial attendance
      await prisma.childAttendance.create({
        data: {
          eventId: testEvent.id,
          childId: testChildren[0].id,
          attendanceStatus: AttendanceStatus.ABSENT,
        },
      });

      // Update to present
      const attendanceDto = {
        attendance: [
          {
            childScoutId: testChildren[0].id,
            attendanceStatus: AttendanceStatus.PRESENT,
          },
        ],
      };

      await request(app.getHttpServer())
        .patch(`/api/events/${testEvent.id}/child-attendance`)
        .set('Cookie', adminCookies)
        .send(attendanceDto)
        .expect(200);

      // Verify update
      const updated = await prisma.childAttendance.findFirst({
        where: {
          eventId: testEvent.id,
          childId: testChildren[0].id,
        },
      });

      expect(updated!.attendanceStatus).toBe(AttendanceStatus.PRESENT);
    });

    it('should validate attendanceStatus enum', async () => {
      const attendanceDto = {
        attendance: [
          {
            childScoutId: testChildren[0].id,
            attendanceStatus: 'INVALID_STATUS',
          },
        ],
      };

      return request(app.getHttpServer())
        .patch(`/api/events/${testEvent.id}/child-attendance`)
        .set('Cookie', adminCookies)
        .send(attendanceDto)
        .expect(400);
    });

    it('should validate required fields', async () => {
      const attendanceDto = {
        attendance: [
          {
            childScoutId: testChildren[0].id,
            // Missing attendanceStatus
          },
        ],
      };

      return request(app.getHttpServer())
        .patch(`/api/events/${testEvent.id}/child-attendance`)
        .set('Cookie', adminCookies)
        .send(attendanceDto)
        .expect(400);
    });

    it('should validate coveredRequirementIds are valid', async () => {
      const attendanceDto = {
        attendance: [
          {
            childScoutId: testChildren[0].id,
            attendanceStatus: AttendanceStatus.PRESENT,
            coveredRequirementIds: ['invalid-id'],
          },
        ],
      };

      return request(app.getHttpServer())
        .patch(`/api/events/${testEvent.id}/child-attendance`)
        .set('Cookie', adminCookies)
        .send(attendanceDto)
        .expect(400);
    });

    it('should return 404 for non-existent event', async () => {
      const attendanceDto = {
        attendance: [
          {
            childScoutId: testChildren[0].id,
            attendanceStatus: AttendanceStatus.PRESENT,
          },
        ],
      };

      return request(app.getHttpServer())
        .patch('/api/events/nonexistent/child-attendance')
        .set('Cookie', adminCookies)
        .send(attendanceDto)
        .expect(404);
    });

    it('should return 404 for non-existent child', async () => {
      const attendanceDto = {
        attendance: [
          {
            childScoutId: 'nonexistent',
            attendanceStatus: AttendanceStatus.PRESENT,
          },
        ],
      };

      return request(app.getHttpServer())
        .patch(`/api/events/${testEvent.id}/child-attendance`)
        .set('Cookie', adminCookies)
        .send(attendanceDto)
        .expect(404);
    });

    it('should allow leader with scope', async () => {
      const attendanceDto = {
        attendance: [
          {
            childScoutId: testChildren[0].id,
            attendanceStatus: AttendanceStatus.PRESENT,
          },
        ],
      };

      return request(app.getHttpServer())
        .patch(`/api/events/${testEvent.id}/child-attendance`)
        .set('Cookie', leaderCookies)
        .send(attendanceDto)
        .expect(200);
    });

    it('should deny parent access', async () => {
      const attendanceDto = {
        attendance: [
          {
            childScoutId: testChildren[0].id,
            attendanceStatus: AttendanceStatus.PRESENT,
          },
        ],
      };

      return request(app.getHttpServer())
        .patch(`/api/events/${testEvent.id}/child-attendance`)
        .set('Cookie', parentCookies)
        .send(attendanceDto)
        .expect(403);
    });

    it('should require authentication', async () => {
      const attendanceDto = {
        attendance: [
          {
            childScoutId: testChildren[0].id,
            attendanceStatus: AttendanceStatus.PRESENT,
          },
        ],
      };

      return request(app.getHttpServer())
        .patch(`/api/events/${testEvent.id}/child-attendance`)
        .send(attendanceDto)
        .expect(401);
    });
  });

  // ====================================================================
  // T049: Contract test for GET /events/:id/child-attendance
  // ====================================================================
  describe('GET /api/events/:id/child-attendance', () => {
    let testEvent: any;
    let testDen: any;
    let testChildren: any[];
    let testRequirements: any[];

    beforeEach(async () => {
      // Create rank and adventure with requirements
      const rank = await prisma.rank.create({
        data: {
          rankLevel: RankLevel.BEAR,
          displayName: 'Bear',
          displayOrder: 4,
          requiredAdventureCount: 6,
          electiveAdventureCount: 1,
        },
      });

      const adventure = await prisma.adventure.create({
        data: {
          rankId: rank.id,
          name: 'Bear Claws',
          classification: AdventureType.REQUIRED,
          displayOrder: 1,
          catalogYear: '2024',
          isActive: true,
        },
      });

      testRequirements = await Promise.all([
        prisma.requirement.create({
          data: {
            adventureId: adventure.id,
            displayOrder: 1,
            requirementText: 'Learn about germs',
          },
        }),
      ]);

      // Create den
      testDen = await prisma.den.create({
        data: {
          name: 'Bear Den 2',
          denNumber: 50,
          rankLevel: RankLevel.BEAR,
          isActive: true,
        },
      });

      // Create children and assign to den
      testChildren = await Promise.all([
        prisma.childScout.create({
          data: {
            firstName: 'Alice',
            lastName: 'Bear',
            currentRank: RankLevel.BEAR,
            isActive: true,
            denMemberships: {
              create: {
                denNumber: testDen.denNumber,
                denId: testDen.id,
                validFrom: new Date(),
              },
            },
          },
        }),
        prisma.childScout.create({
          data: {
            firstName: 'Bob',
            lastName: 'Bear',
            currentRank: RankLevel.BEAR,
            isActive: true,
            denMemberships: {
              create: {
                denNumber: testDen.denNumber,
                denId: testDen.id,
                validFrom: new Date(),
              },
            },
          },
        }),
      ]);

      // Create event
      testEvent = await prisma.event.create({
        data: {
          title: 'Bear Den Meeting',
          description: 'Weekly meeting',
          eventDate: new Date('2026-06-05T18:00:00Z'),
          duration: 90,
          location: 'School',
          needsVolunteers: false,
          status: 'ACTIVE',
        },
      });

      // Create den event link
      await prisma.denEvent.create({
        data: {
          eventId: testEvent.id,
          denNumber: testDen.denNumber,
          denId: testDen.id,
        },
      });

      // Create attendance records
      const attendance1 = await prisma.childAttendance.create({
        data: {
          eventId: testEvent.id,
          childId: testChildren[0].id,
          attendanceStatus: AttendanceStatus.PRESENT,
          notes: 'Great job',
        },
      });

      const attendance2 = await prisma.childAttendance.create({
        data: {
          eventId: testEvent.id,
          childId: testChildren[1].id,
          attendanceStatus: AttendanceStatus.ABSENT,
        },
      });

      // Link requirements to attendance
      await prisma.$executeRaw`
        INSERT INTO "_ChildAttendanceToRequirement" ("A", "B")
        VALUES (${attendance1.id}, ${testRequirements[0].id})
      `;
    });

    it('should get attendance records as admin', async () => {
      return request(app.getHttpServer())
        .get(`/api/events/${testEvent.id}/child-attendance`)
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.event).toBeDefined();
          expect(res.body.event.id).toBe(testEvent.id);
          expect(res.body.attendance).toHaveLength(2);
        });
    });

    it('should include child details', async () => {
      return request(app.getHttpServer())
        .get(`/api/events/${testEvent.id}/child-attendance`)
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          const alice = res.body.attendance.find((a: any) => a.child.firstName === 'Alice');
          expect(alice).toBeDefined();
          expect(alice.child.lastName).toBe('Bear');
          expect(alice.attendanceStatus).toBe(AttendanceStatus.PRESENT);
          expect(alice.notes).toBe('Great job');
        });
    });

    it('should include covered requirements', async () => {
      return request(app.getHttpServer())
        .get(`/api/events/${testEvent.id}/child-attendance`)
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          const alice = res.body.attendance.find((a: any) => a.child.firstName === 'Alice');
          expect(alice.coveredRequirements).toHaveLength(1);
          expect(alice.coveredRequirements[0].requirementText).toBe('Learn about germs');
        });
    });

    it('should filter by attendanceStatus', async () => {
      return request(app.getHttpServer())
        .get(`/api/events/${testEvent.id}/child-attendance`)
        .query({ status: AttendanceStatus.PRESENT })
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.attendance).toHaveLength(1);
          expect(res.body.attendance[0].attendanceStatus).toBe(AttendanceStatus.PRESENT);
        });
    });

    it('should return empty array when no attendance recorded', async () => {
      // Create new event with no attendance
      const emptyEvent = await prisma.event.create({
        data: {
          title: 'New Meeting',
          description: 'Test',
          eventDate: new Date('2026-07-01T18:00:00Z'),
          duration: 60,
          location: 'TBD',
          needsVolunteers: false,
          status: 'ACTIVE',
        },
      });

      return request(app.getHttpServer())
        .get(`/api/events/${emptyEvent.id}/child-attendance`)
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          expect(res.body.attendance).toHaveLength(0);
        });
    });

    it('should return 404 for non-existent event', async () => {
      return request(app.getHttpServer())
        .get('/api/events/nonexistent/child-attendance')
        .set('Cookie', adminCookies)
        .expect(404);
    });

    it('should allow leader with scope', async () => {
      return request(app.getHttpServer())
        .get(`/api/events/${testEvent.id}/child-attendance`)
        .set('Cookie', leaderCookies)
        .expect(200);
    });

    it('should deny parent access', async () => {
      return request(app.getHttpServer())
        .get(`/api/events/${testEvent.id}/child-attendance`)
        .set('Cookie', parentCookies)
        .expect(403);
    });

    it('should require authentication', async () => {
      return request(app.getHttpServer())
        .get(`/api/events/${testEvent.id}/child-attendance`)
        .expect(401);
    });
  });
});
