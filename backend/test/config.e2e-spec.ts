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
import { AuthTier } from '@prisma/client';

describe('Config API (e2e)', () => {
  let app: INestApplication;

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

  afterEach(async () => {
    // Clean up test data in correct order for foreign key constraints
    await prisma.signup.deleteMany();
    await prisma.activitySlot.deleteMany();
    await prisma.event.deleteMany();
    await prisma.pointEvent.deleteMany();
    await prisma.volunteerToRole.deleteMany();
    await prisma.childRank.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.volunteer.deleteMany();
    
    // Delete test-created activity types (keep seeded ones)
    // Test activity types have predictable test names starting with "Test" or containing test-specific patterns
    await prisma.activityType.deleteMany({
      where: {
        OR: [
          { name: { startsWith: 'Test' } },
          { name: { startsWith: 'Special Event' } },
          { name: { startsWith: 'No Description' } },
          { name: { startsWith: 'Duplicate' } },
          { name: { startsWith: 'Invalid' } },
          { name: { startsWith: 'Wrong' } },
          { name: { startsWith: 'Missing' } },
          { name: { startsWith: 'Negative' } },
          { name: { startsWith: 'Zero' } },
          { name: { startsWith: 'Decimal' } },
          { name: { startsWith: 'Long' } },
          { name: { startsWith: 'Original' } },
          { name: { startsWith: 'Updated' } },
          { name: { startsWith: 'Existing' } },
          { name: { startsWith: 'Different' } },
          { name: { startsWith: 'To Delete' } },
          { name: { startsWith: 'Already Deleted' } },
          { name: { startsWith: 'In Use' } },
          { name: { startsWith: 'Past Event' } },
          { name: { startsWith: 'Deleted Activity' } },
        ],
      },
    });
  });

  /**
   * Helper function to login and get cookies
   */
  async function loginVolunteer(email: string, password: string) {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });
    
    return loginRes.headers['set-cookie'];
  }

  /**
   * Helper function to create a test admin user with unique email
   */
  async function createTestAdmin() {
    const uniqueId = Date.now() + Math.random();
    const password = 'Admin123!';
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await createTestVolunteer({
      email: `admin-${uniqueId}@example.com`,
      passwordHash,
      name: 'Admin User',
      authTier: AuthTier.ADMIN,
    });

    const cookies = await loginVolunteer(`admin-${uniqueId}@example.com`, password);
    return { admin, cookies, password };
  }

  /**
   * Helper function to create a test parent user with unique email
   */
  async function createTestParent() {
    const uniqueId = Date.now() + Math.random();
    const password = 'Parent123!';
    const passwordHash = await bcrypt.hash(password, 12);
    const parent = await createTestVolunteer({
      email: `parent-${uniqueId}@example.com`,
      passwordHash,
      name: 'Parent User',
      authTier: AuthTier.PARENT,
    });

    const cookies = await loginVolunteer(`parent-${uniqueId}@example.com`, password);
    return { parent, cookies, password };
  }

  describe('GET /api/pack-config/activity-types', () => {
    it('should get all activity types as authenticated user', async () => {
      const { cookies } = await createTestParent();

      return request(app.getHttpServer())
        .get('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('activityTypes');
          expect(Array.isArray(res.body.activityTypes)).toBe(true);
          // Should have seeded activity types
          expect(res.body.activityTypes.length).toBeGreaterThan(0);
          
          // Verify structure of activity type
          const activityType = res.body.activityTypes[0];
          expect(activityType).toHaveProperty('id');
          expect(activityType).toHaveProperty('name');
          expect(activityType).toHaveProperty('pointValue');
          expect(activityType).toHaveProperty('category');
          expect(activityType).toHaveProperty('description');
        });
    });

    it('should return only active (non-deleted) activity types', async () => {
      const { cookies } = await createTestAdmin();
      
      // Create and then soft delete an activity type
      const created = await prisma.activityType.create({
        data: {
          name: 'Deleted Activity',
          pointValue: 7,
          category: 'MEDIUM',
          description: 'Should not appear',
        },
      });

      await prisma.activityType.update({
        where: { id: created.id },
        data: { deletedAt: new Date() },
      });

      const response = await request(app.getHttpServer())
        .get('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .expect(200);

      // Deleted activity should not be in the list
      const deletedActivity = response.body.activityTypes.find(
        (a: any) => a.id === created.id
      );
      expect(deletedActivity).toBeUndefined();
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/pack-config/activity-types')
        .expect(401);
    });
  });

  describe('POST /api/pack-config/activity-types', () => {
    it('should create activity type as admin', async () => {
      const { cookies } = await createTestAdmin();

      return request(app.getHttpServer())
        .post('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .send({
          name: 'Test Activity',
          pointValue: 7,
          category: 'MEDIUM',
          description: 'Test description',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('Test Activity');
          expect(res.body.pointValue).toBe(7);
          expect(res.body.category).toBe('MEDIUM');
          expect(res.body.description).toBe('Test description');
          expect(res.body).toHaveProperty('createdAt');
        });
    });

    it('should create activity type with SPECIAL category and custom points', async () => {
      const { cookies } = await createTestAdmin();

      return request(app.getHttpServer())
        .post('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .send({
          name: 'Special Event',
          pointValue: 50,
          category: 'SPECIAL',
          description: 'Extra special activity',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('Special Event');
          expect(res.body.pointValue).toBe(50);
          expect(res.body.category).toBe('SPECIAL');
        });
    });

    it('should create activity type without description', async () => {
      const { cookies } = await createTestAdmin();

      return request(app.getHttpServer())
        .post('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .send({
          name: 'No Description Activity',
          pointValue: 3,
          category: 'LOW',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('No Description Activity');
          expect(res.body.description).toBeNull();
        });
    });

    it('should reject creation with duplicate name', async () => {
      const { cookies } = await createTestAdmin();

      // Create first activity
      await request(app.getHttpServer())
        .post('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .send({
          name: 'Duplicate Name',
          pointValue: 7,
          category: 'MEDIUM',
        })
        .expect(201);

      // Try to create another with same name
      return request(app.getHttpServer())
        .post('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .send({
          name: 'Duplicate Name',
          pointValue: 15,
          category: 'HIGH',
        })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('already exists');
        });
    });

    it('should reject creation with invalid point value for category', async () => {
      const { cookies } = await createTestAdmin();

      // LOW category should be 1-5 points, not 10
      return request(app.getHttpServer())
        .post('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .send({
          name: 'Invalid Points',
          pointValue: 10,
          category: 'LOW',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toBe('Invalid input');
        });
    });

    it('should reject creation with MEDIUM category and LOW point value', async () => {
      const { cookies } = await createTestAdmin();

      // MEDIUM category should be 6-10 points, not 3
      return request(app.getHttpServer())
        .post('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .send({
          name: 'Wrong Points',
          pointValue: 3,
          category: 'MEDIUM',
        })
        .expect(400);
    });

    it('should reject creation with HIGH category and MEDIUM point value', async () => {
      const { cookies } = await createTestAdmin();

      // HIGH category should be 11-20 points, not 8
      return request(app.getHttpServer())
        .post('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .send({
          name: 'Wrong Points',
          pointValue: 8,
          category: 'HIGH',
        })
        .expect(400);
    });

    it('should reject creation with missing required fields', async () => {
      const { cookies } = await createTestAdmin();

      return request(app.getHttpServer())
        .post('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .send({
          name: 'Missing Fields',
          // Missing pointValue and category
        })
        .expect(400);
    });

    it('should reject creation with negative point value', async () => {
      const { cookies } = await createTestAdmin();

      return request(app.getHttpServer())
        .post('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .send({
          name: 'Negative Points',
          pointValue: -5,
          category: 'MEDIUM',
        })
        .expect(400);
    });

    it('should reject creation with zero point value', async () => {
      const { cookies } = await createTestAdmin();

      return request(app.getHttpServer())
        .post('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .send({
          name: 'Zero Points',
          pointValue: 0,
          category: 'LOW',
        })
        .expect(400);
    });

    it('should reject creation with non-integer point value', async () => {
      const { cookies } = await createTestAdmin();

      return request(app.getHttpServer())
        .post('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .send({
          name: 'Decimal Points',
          pointValue: 5.5,
          category: 'MEDIUM',
        })
        .expect(400);
    });

    it('should reject creation with invalid category', async () => {
      const { cookies } = await createTestAdmin();

      return request(app.getHttpServer())
        .post('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .send({
          name: 'Invalid Category',
          pointValue: 5,
          category: 'INVALID',
        })
        .expect(400);
    });

    it('should reject creation with description over 500 characters', async () => {
      const { cookies } = await createTestAdmin();

      return request(app.getHttpServer())
        .post('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .send({
          name: 'Long Description',
          pointValue: 7,
          category: 'MEDIUM',
          description: 'x'.repeat(501),
        })
        .expect(400);
    });

    it('should reject creation with empty name', async () => {
      const { cookies } = await createTestAdmin();

      return request(app.getHttpServer())
        .post('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .send({
          name: '',
          pointValue: 7,
          category: 'MEDIUM',
        })
        .expect(400);
    });

    it('should reject creation with name over 100 characters', async () => {
      const { cookies } = await createTestAdmin();

      return request(app.getHttpServer())
        .post('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .send({
          name: 'x'.repeat(101),
          pointValue: 7,
          category: 'MEDIUM',
        })
        .expect(400);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/pack-config/activity-types')
        .send({
          name: 'Test Activity',
          pointValue: 7,
          category: 'MEDIUM',
        })
        .expect(401);
    });

    it('should reject creation by non-admin (parent tier)', async () => {
      const { cookies } = await createTestParent();

      return request(app.getHttpServer())
        .post('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .send({
          name: 'Test Activity',
          pointValue: 7,
          category: 'MEDIUM',
        })
        .expect(403);
    });

    it('should reject creation by non-admin (leader tier)', async () => {
      const password = 'Leader123!';
      const passwordHash = await bcrypt.hash(password, 12);
      await createTestVolunteer({
        email: 'leader@example.com',
        passwordHash,
        authTier: AuthTier.LEADER,
      });

      const cookies = await loginVolunteer('leader@example.com', password);

      return request(app.getHttpServer())
        .post('/api/pack-config/activity-types')
        .set('Cookie', cookies)
        .send({
          name: 'Test Activity',
          pointValue: 7,
          category: 'MEDIUM',
        })
        .expect(403);
    });
  });

  describe('PUT /api/pack-config/activity-types/:id', () => {
    it('should update activity type name', async () => {
      const { cookies } = await createTestAdmin();

      // Create activity type first
      const created = await prisma.activityType.create({
        data: {
          name: 'Original Name',
          pointValue: 7,
          category: 'MEDIUM',
        },
      });

      return request(app.getHttpServer())
        .put(`/api/pack-config/activity-types/${created.id}`)
        .set('Cookie', cookies)
        .send({
          name: 'Updated Name',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(created.id);
          expect(res.body.name).toBe('Updated Name');
          expect(res.body.pointValue).toBe(7); // Unchanged
          expect(res.body.category).toBe('MEDIUM'); // Unchanged
        });
    });

    it('should update activity type point value', async () => {
      const { cookies } = await createTestAdmin();

      const created = await prisma.activityType.create({
        data: {
          name: 'Test Activity - Point Value',
          pointValue: 7,
          category: 'MEDIUM',
        },
      });

      return request(app.getHttpServer())
        .put(`/api/pack-config/activity-types/${created.id}`)
        .set('Cookie', cookies)
        .send({
          pointValue: 8,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.pointValue).toBe(8);
        });
    });

    it('should update activity type category', async () => {
      const { cookies } = await createTestAdmin();

      const created = await prisma.activityType.create({
        data: {
          name: 'Test Activity - Category',
          pointValue: 15,
          category: 'HIGH',
        },
      });

      return request(app.getHttpServer())
        .put(`/api/pack-config/activity-types/${created.id}`)
        .set('Cookie', cookies)
        .send({
          category: 'HIGH',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.category).toBe('HIGH');
        });
    });

    it('should update multiple fields at once', async () => {
      const { cookies } = await createTestAdmin();

      const created = await prisma.activityType.create({
        data: {
          name: 'Test Activity - Multiple Fields',
          pointValue: 7,
          category: 'MEDIUM',
          description: 'Original description',
        },
      });

      return request(app.getHttpServer())
        .put(`/api/pack-config/activity-types/${created.id}`)
        .set('Cookie', cookies)
        .send({
          name: 'Updated Activity',
          pointValue: 15,
          category: 'HIGH',
          description: 'Updated description',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Activity');
          expect(res.body.pointValue).toBe(15);
          expect(res.body.category).toBe('HIGH');
          expect(res.body.description).toBe('Updated description');
        });
    });

    it('should update description to null', async () => {
      const { cookies } = await createTestAdmin();

      const created = await prisma.activityType.create({
        data: {
          name: 'Test Activity - Null Description',
          pointValue: 8,
          category: 'MEDIUM',
          description: 'Has description',
        },
      });

      return request(app.getHttpServer())
        .put(`/api/pack-config/activity-types/${created.id}`)
        .set('Cookie', cookies)
        .send({
          description: null,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.description).toBeNull();
        });
    });

    it('should reject update with duplicate name', async () => {
      const { cookies } = await createTestAdmin();

      // Create two activity types
      await prisma.activityType.create({
        data: {
          name: 'Existing Name',
          pointValue: 7,
          category: 'MEDIUM',
        },
      });

      const toUpdate = await prisma.activityType.create({
        data: {
          name: 'Different Name',
          pointValue: 8,
          category: 'MEDIUM',
        },
      });

      // Try to update second one to use first one's name
      return request(app.getHttpServer())
        .put(`/api/pack-config/activity-types/${toUpdate.id}`)
        .set('Cookie', cookies)
        .send({
          name: 'Existing Name',
        })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('already exists');
        });
    });

    it('should reject update with mismatched point value and category', async () => {
      const { cookies } = await createTestAdmin();

      const created = await prisma.activityType.create({
        data: {
          name: 'Test Activity - Mismatch',
          pointValue: 7,
          category: 'MEDIUM',
        },
      });

      // Try to update to HIGH category with LOW point value
      return request(app.getHttpServer())
        .put(`/api/pack-config/activity-types/${created.id}`)
        .set('Cookie', cookies)
        .send({
          pointValue: 3,
          category: 'HIGH', // HIGH requires 11-20 points
        })
        .expect(400);
    });

    it('should reject update of non-existent activity type', async () => {
      const { cookies } = await createTestAdmin();

      return request(app.getHttpServer())
        .put('/api/pack-config/activity-types/non-existent-id')
        .set('Cookie', cookies)
        .send({
          name: 'Updated Name',
        })
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('not found');
        });
    });

    it('should reject update of deleted activity type', async () => {
      const { cookies } = await createTestAdmin();

      const created = await prisma.activityType.create({
        data: {
          name: 'Deleted Activity',
          pointValue: 7,
          category: 'MEDIUM',
          deletedAt: new Date(),
        },
      });

      return request(app.getHttpServer())
        .put(`/api/pack-config/activity-types/${created.id}`)
        .set('Cookie', cookies)
        .send({
          name: 'Try to Update',
        })
        .expect(404);
    });

    it('should require authentication', async () => {
      const created = await prisma.activityType.create({
        data: {
          name: 'Test Activity - Auth Required',
          pointValue: 7,
          category: 'MEDIUM',
        },
      });

      return request(app.getHttpServer())
        .put(`/api/pack-config/activity-types/${created.id}`)
        .send({
          name: 'Updated Name',
        })
        .expect(401);
    });

    it('should reject update by non-admin', async () => {
      const { cookies } = await createTestParent();

      const created = await prisma.activityType.create({
        data: {
          name: 'Test Activity - Non Admin',
          pointValue: 7,
          category: 'MEDIUM',
        },
      });

      return request(app.getHttpServer())
        .put(`/api/pack-config/activity-types/${created.id}`)
        .set('Cookie', cookies)
        .send({
          name: 'Updated Name',
        })
        .expect(403);
    });
  });

  describe('DELETE /api/pack-config/activity-types/:id', () => {
    it('should soft delete activity type', async () => {
      const { cookies } = await createTestAdmin();

      const created = await prisma.activityType.create({
        data: {
          name: 'To Delete',
          pointValue: 7,
          category: 'MEDIUM',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/pack-config/activity-types/${created.id}`)
        .set('Cookie', cookies)
        .expect(204);

      // Verify it's soft deleted
      const deleted = await prisma.activityType.findUnique({
        where: { id: created.id },
      });
      expect(deleted).not.toBeNull();
      expect(deleted!.deletedAt).not.toBeNull();
    });

    it('should reject deletion of non-existent activity type', async () => {
      const { cookies } = await createTestAdmin();

      return request(app.getHttpServer())
        .delete('/api/pack-config/activity-types/non-existent-id')
        .set('Cookie', cookies)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('not found');
        });
    });

    it('should reject deletion of already deleted activity type', async () => {
      const { cookies } = await createTestAdmin();

      const created = await prisma.activityType.create({
        data: {
          name: 'Already Deleted',
          pointValue: 7,
          category: 'MEDIUM',
          deletedAt: new Date(),
        },
      });

      return request(app.getHttpServer())
        .delete(`/api/pack-config/activity-types/${created.id}`)
        .set('Cookie', cookies)
        .expect(404);
    });

    it('should reject deletion of activity type in use by future event', async () => {
      const { cookies, admin } = await createTestAdmin();

      const activityType = await prisma.activityType.create({
        data: {
          name: 'In Use Activity',
          pointValue: 7,
          category: 'MEDIUM',
        },
      });

      // Create a future event with this activity type
      const event = await prisma.event.create({
        data: {
          title: 'Future Event',
          eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          rankLevel: 'WOLF',
          createdById: admin.id,
        },
      });

      await prisma.activitySlot.create({
        data: {
          eventId: event.id,
          activityTypeId: activityType.id,
          capacity: 10,
        },
      });

      return request(app.getHttpServer())
        .delete(`/api/pack-config/activity-types/${activityType.id}`)
        .set('Cookie', cookies)
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('in use by future events');
        });
    });

    it('should allow deletion of activity type used only by past events', async () => {
      const { cookies, admin } = await createTestAdmin();

      const activityType = await prisma.activityType.create({
        data: {
          name: 'Past Event Activity',
          pointValue: 7,
          category: 'MEDIUM',
        },
      });

      // Create a past event with this activity type
      const event = await prisma.event.create({
        data: {
          title: 'Past Event',
          eventDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          rankLevel: 'WOLF',
          createdById: admin.id,
        },
      });

      await prisma.activitySlot.create({
        data: {
          eventId: event.id,
          activityTypeId: activityType.id,
          capacity: 10,
        },
      });

      return request(app.getHttpServer())
        .delete(`/api/pack-config/activity-types/${activityType.id}`)
        .set('Cookie', cookies)
        .expect(204);
    });

    it('should require authentication', async () => {
      const created = await prisma.activityType.create({
        data: {
          name: 'Test Activity - Delete Auth',
          pointValue: 7,
          category: 'MEDIUM',
        },
      });

      return request(app.getHttpServer())
        .delete(`/api/pack-config/activity-types/${created.id}`)
        .expect(401);
    });

    it('should reject deletion by non-admin', async () => {
      const { cookies } = await createTestParent();

      const created = await prisma.activityType.create({
        data: {
          name: 'Test Activity - Delete Non Admin',
          pointValue: 7,
          category: 'MEDIUM',
        },
      });

      return request(app.getHttpServer())
        .delete(`/api/pack-config/activity-types/${created.id}`)
        .set('Cookie', cookies)
        .expect(403);
    });
  });
});
