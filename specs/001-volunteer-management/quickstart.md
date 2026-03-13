# Quickstart Guide: Volunteer Management System
## Getting Started with Development

*Feature: 001-volunteer-management*

This guide helps you set up the volunteer management system for local development in under 10 minutes.

---

## Prerequisites

Before you begin, ensure you have installed:

- **Node.js**: v20.x LTS or higher ([download](https://nodejs.org/))
- **npm**: v10.x or higher (comes with Node.js)
- **Git**: For version control

Verify installations:
```bash
node --version  # Should show v20.x.x
npm --version   # Should show v10.x.x
```

---

## Project Structure Overview

```
volunteer-webapp/
├── backend/                 # Express.js API server
│   ├── prisma/             # Database schema and migrations
│   ├── src/                # Source code
│   └── tests/              # Contract, integration, unit tests
├── frontend/               # Next.js 14 application
│   ├── src/                # Source code
│   └── tests/              # E2E and unit tests
└── specs/                  # Feature specifications (this directory)
```

---

## Step 1: Clone and Install

### Clone Repository
```bash
git clone <repository-url>
cd volunteer-webapp
git checkout 001-volunteer-management
```

### Install Backend Dependencies
```bash
cd backend
npm install
```

Expected packages:
- `express` - Web framework
- `@prisma/client` - Database ORM
- `prisma` - Database toolkit
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT authentication
- `zod` - Validation
- `cors`, `helmet`, `cookie-parser` - Middleware
- `express-rate-limit` - Rate limiting
- `jest`, `supertest` - Testing

### Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

Expected packages:
- `next` - React framework
- `react`, `react-dom` - React library
- `axios` - HTTP client
- `tailwindcss` - CSS framework
- `@shadcn/ui` - UI components
- `vitest`, `@testing-library/react`, `playwright` - Testing

---

## Step 2: Configure Environment Variables

### Backend Configuration

Create `backend/.env`:
```env
# Database
DATABASE_URL="file:./dev.db"

# JWT Secrets (generate secure random strings for production)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"

# Server
PORT=3001
NODE_ENV="development"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:3000"

# Email (optional for development, required for password reset)
# SMTP_HOST="smtp.gmail.com"
# SMTP_PORT=587
# SMTP_USER="your-email@gmail.com"
# SMTP_PASS="your-app-password"
```

**Security Note**: Never commit `.env` files. Use `.env.example` for templates.

### Frontend Configuration

Create `frontend/.env.local`:
```env
# API URL
NEXT_PUBLIC_API_URL="http://localhost:3001/api"

# Environment
NEXT_PUBLIC_ENV="development"
```

---

## Step 3: Initialize Database

### Run Migrations

```bash
cd backend
npx prisma migrate dev --name init
```

This will:
1. Create SQLite database at `backend/prisma/dev.db`
2. Apply all migrations from `backend/prisma/migrations/`
3. Generate Prisma Client types

### Seed Initial Data

Create `backend/prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Pack Configuration
  const packConfig = await prisma.packConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      packName: 'Pack 123',
      packNumber: '123',
      yearStartDate: new Date('2025-09-01'),
      yearEndDate: new Date('2026-08-31'),
      activeRanks: ['LION', 'TIGER', 'WOLF', 'BEAR', 'WEBELOS', 'AOL']
    }
  });
  console.log('✓ Pack configuration created');

  // 2. Create Badge Tiers
  const badgeTiers = [
    { tierName: 'Lion', minPoints: 0, maxPoints: 19, displayOrder: 1, badgeColor: '#FFD700' },
    { tierName: 'Tiger', minPoints: 20, maxPoints: 39, displayOrder: 2, badgeColor: '#FF8C00' },
    { tierName: 'Wolf', minPoints: 40, maxPoints: 59, displayOrder: 3, badgeColor: '#DC143C' },
    { tierName: 'Bear', minPoints: 60, maxPoints: 79, displayOrder: 4, badgeColor: '#8B4513' },
    { tierName: 'Webelos', minPoints: 80, maxPoints: 99, displayOrder: 5, badgeColor: '#4169E1' },
    { tierName: 'Arrow of Light', minPoints: 100, maxPoints: null, displayOrder: 6, badgeColor: '#DAA520' }
  ];

  for (const tier of badgeTiers) {
    await prisma.badgeTier.upsert({
      where: { tierName: tier.tierName },
      update: {},
      create: tier
    });
  }
  console.log('✓ Badge tiers created');

  // 3. Create Default Activity Types
  const activityTypes = [
    { name: 'Event Setup', pointValue: 2, category: 'LOW', description: 'Help set up before an event' },
    { name: 'Event Cleanup', pointValue: 2, category: 'LOW', description: 'Help clean up after an event' },
    { name: 'Event Volunteer', pointValue: 5, category: 'MEDIUM', description: 'Volunteer during an event' },
    { name: 'Den Meeting Lead', pointValue: 8, category: 'MEDIUM', description: 'Lead a den meeting' },
    { name: 'Pack Meeting Help', pointValue: 10, category: 'HIGH', description: 'Assist with pack meeting activities' },
    { name: 'Camping Trip', pointValue: 15, category: 'HIGH', description: 'Volunteer for overnight camping trip' },
    { name: 'Special Event Organizer', pointValue: 25, category: 'SPECIAL', description: 'Organize a major pack event' }
  ];

  for (const activity of activityTypes) {
    await prisma.activityType.upsert({
      where: { name: activity.name },
      update: {},
      create: activity as any
    });
  }
  console.log('✓ Activity types created');

  // 4. Create Default Volunteer Roles
  const volunteerRoles = [
    { name: 'Parent/Guardian', roleType: 'PARENT_GUARDIAN', grantsTier: 'PARENT', description: 'Default parent volunteer role' },
    { name: 'Committee Chair', roleType: 'COMMITTEE', specialty: 'chair', grantsTier: 'LEADER' },
    { name: 'Committee Member - Treasurer', roleType: 'COMMITTEE', specialty: 'treasurer', grantsTier: 'LEADER' },
    { name: 'Committee Member - Secretary', roleType: 'COMMITTEE', specialty: 'secretary', grantsTier: 'LEADER' },
    { name: 'Lion Den Leader', roleType: 'DEN_LEADER', rankLevel: 'LION', grantsTier: 'LEADER' },
    { name: 'Tiger Den Leader', roleType: 'DEN_LEADER', rankLevel: 'TIGER', grantsTier: 'LEADER' },
    { name: 'Wolf Den Leader', roleType: 'DEN_LEADER', rankLevel: 'WOLF', grantsTier: 'LEADER' },
    { name: 'Bear Den Leader', roleType: 'DEN_LEADER', rankLevel: 'BEAR', grantsTier: 'LEADER' },
    { name: 'Webelos Den Leader', roleType: 'DEN_LEADER', rankLevel: 'WEBELOS', grantsTier: 'LEADER' },
    { name: 'Lion Guide', roleType: 'LION_GUIDE', grantsTier: 'PARENT' }
  ];

  for (const role of volunteerRoles) {
    await prisma.volunteerRole.upsert({
      where: { name: role.name },
      update: {},
      create: role as any
    });
  }
  console.log('✓ Volunteer roles created');

  // 5. Create Test Admin User
  const adminPasswordHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.volunteer.upsert({
    where: { email: 'admin@pack123.org' },
    update: {},
    create: {
      email: 'admin@pack123.org',
      name: 'Site Admin',
      passwordHash: adminPasswordHash,
      authTier: 'ADMIN',
      leaderboardOptIn: true
    }
  });

  await prisma.volunteerPointBalance.upsert({
    where: { volunteerId: admin.id },
    update: {},
    create: {
      volunteerId: admin.id,
      totalPoints: 0,
      currentYearPoints: 0
    }
  });
  console.log('✓ Admin user created (admin@pack123.org / Admin123!)');

  console.log('\n✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run seed script:
```bash
npx prisma db seed
```

Add to `backend/package.json`:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

---

## Step 4: Start Development Servers

### Terminal 1: Backend Server
```bash
cd backend
npm run dev
```

Expected output:
```
🚀 Server running on http://localhost:3001
📊 Database connected
```

Backend will be available at: `http://localhost:3001`

### Terminal 2: Frontend Server
```bash
cd frontend
npm run dev
```

Expected output:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000

✓ Ready in 2.3s
```

Frontend will be available at: `http://localhost:3000`

---

## Step 5: Verify Installation

### Test Backend API

**Health Check**:
```bash
curl http://localhost:3001/api/health
```

Expected: `{"status":"ok"}`

**Login as Admin**:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pack123.org","password":"Admin123!"}'
```

Expected response:
```json
{
  "user": {
    "id": "...",
    "email": "admin@pack123.org",
    "name": "Site Admin",
    "authTier": "ADMIN"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Get Pack Configuration** (using token from login):
```bash
curl http://localhost:3001/api/pack-config \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Test Frontend

1. Open browser to `http://localhost:3000`
2. You should see the login page
3. Login with: `admin@pack123.org` / `Admin123!`
4. You should be redirected to the dashboard

---

## Step 6: Run Tests

### Backend Tests

**Unit Tests** (Jest):
```bash
cd backend
npm run test
```

**Contract Tests** (Supertest):
```bash
npm run test:contract
```

**All Tests**:
```bash
npm run test:all
```

### Frontend Tests

**Unit Tests** (Vitest + React Testing Library):
```bash
cd frontend
npm run test
```

**E2E Tests** (Playwright):
```bash
npm run test:e2e
```

---

## Common Development Tasks

### View Database in Prisma Studio

```bash
cd backend
npx prisma studio
```

Opens interactive database viewer at `http://localhost:5555`

### Reset Database

```bash
cd backend
npx prisma migrate reset
# Confirms and runs seed automatically
```

### Generate Prisma Client (after schema changes)

```bash
cd backend
npx prisma generate
```

### Create New Migration

```bash
cd backend
npx prisma migrate dev --name add_new_field
```

### Format Backend Code

```bash
cd backend
npm run format
```

### Lint Frontend Code

```bash
cd frontend
npm run lint
```

---

## API Examples

### Register New Volunteer

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "name": "John Doe",
    "phone": "+15551234567"
  }'
```

### Create Event (requires LEADER or ADMIN tier)

```bash
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "Fall Festival Setup",
    "description": "Help set up for the annual fall festival",
    "eventDate": "2025-10-15T14:00:00Z",
    "eventTime": "2:00 PM - 5:00 PM",
    "location": "Pack Meeting Hall",
    "rankLevel": "PACK_WIDE",
    "activitySlots": [
      {
        "activityTypeId": "...",
        "capacity": 5
      }
    ]
  }'
```

### Sign Up for Event

```bash
curl -X POST http://localhost:3001/api/events/{eventId}/slots/{slotId}/signup \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### View Leaderboard

```bash
curl http://localhost:3001/api/leaderboard \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Troubleshooting

### Port Already in Use

**Backend**:
```bash
# Find process using port 3001
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill process or change PORT in backend/.env
```

**Frontend**:
```bash
# Next.js will auto-increment to 3001, 3002, etc.
# Or specify port: npm run dev -- -p 3005
```

### Database Lock Error (SQLite)

```bash
# Close Prisma Studio and restart backend
# SQLite allows only one writer at a time
```

### JWT Verification Fails

- Check `JWT_SECRET` matches between backend/.env and frontend API calls
- Ensure token hasn't expired (15 min for access tokens)
- Use refresh token endpoint to get new access token

### CORS Errors

- Verify `FRONTEND_URL` in backend/.env matches frontend dev server URL
- Check browser console for specific CORS error details

---

## Next Steps

Now that your development environment is set up:

1. **Read the Spec**: Review `specs/001-volunteer-management/spec.md` for user stories and requirements
2. **Review Data Model**: Check `specs/001-volunteer-management/data-model.md` for database schema
3. **Explore API Contracts**: See `specs/001-volunteer-management/contracts/` for endpoint specifications
4. **Implement Features**: Start with P1 user stories (authentication, profiles, events)
5. **Write Tests First**: Follow BDD approach per constitution

---

## Useful Commands Reference

| Task | Command |
|------|---------|
| **Start backend** | `cd backend && npm run dev` |
| **Start frontend** | `cd frontend && npm run dev` |
| **View database** | `cd backend && npx prisma studio` |
| **Reset database** | `cd backend && npx prisma migrate reset` |
| **Run backend tests** | `cd backend && npm run test` |
| **Run frontend tests** | `cd frontend && npm run test` |
| **Run E2E tests** | `cd frontend && npm run test:e2e` |
| **Format code** | `npm run format` (in respective directory) |
| **Lint code** | `npm run lint` (in respective directory) |
| **Generate types** | `cd backend && npx prisma generate` |

---

## Additional Resources

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Zod Validation](https://zod.dev/)
- [JWT Best Practices](https://jwt.io/introduction)
- [Playwright Testing](https://playwright.dev/docs/intro)

---

**Ready to build!** 🚀

If you encounter issues not covered here, check the project's CONTRIBUTING.md or open an issue on GitHub.
