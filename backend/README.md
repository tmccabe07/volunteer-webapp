# Backend API - Cub Scout Volunteer Management

**Framework**: NestJS with TypeScript  
**Database**: SQLite (via Prisma ORM)  
**Node Version**: 20.x LTS

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Architecture](#architecture)
4. [Database Management](#database-management)
5. [Testing](#testing)
6. [API Documentation](#api-documentation)
7. [Development Guidelines](#development-guidelines)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- Node.js 20.x LTS
- npm 10.x or later
- SQLite3 (usually bundled with Node)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed database with initial data
npx prisma db seed

# Note: On Windows, you may see exit code 3221225477 after successful seeding
# This is a known issue with the libsql adapter cleanup. If you see all the
# success messages (✓), the seed completed successfully despite the error code.
```

### Running the Application

```bash
# Development mode (with auto-reload)
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

The API will be available at `http://localhost:3001` (or the port specified in `.env`).

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database
DATABASE_URL="file:./dev.db"

# JWT Secrets (generate secure random strings for production)
JWT_ACCESS_SECRET="your-access-secret-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"

# Server
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN="http://localhost:3000"

# Rate Limiting
RATE_LIMIT_TTL=900000  # 15 minutes in milliseconds
RATE_LIMIT_MAX=5       # Max requests per TTL

# Calendar feed URLs (required in production)
# Set this to the public base URL of the backend so that .ics feed links
# embedded in the app point to the correct host instead of localhost.
# Example: BACKEND_PUBLIC_URL="https://api.yourdomain.com"
# If unset, the URL is inferred from the incoming request (fine for local dev).
BACKEND_PUBLIC_URL=

# Email (Feature: 012-email-integration)
# EMAIL_TRANSPORT: console (default, logs to stdout) | resend (production)
# EMAIL_FROM: sender address shown to recipients
# RESEND_API_KEY: required only when EMAIL_TRANSPORT=resend
EMAIL_TRANSPORT=console
EMAIL_FROM=noreply@cubscouts.local
# RESEND_API_KEY=re_xxxxxxxxxxxx
```

**Security Note**: Never commit the `.env` file to version control. Always generate strong, unique secrets for production.

---

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma           # Database schema (single source of truth)
│   ├── seed.ts                 # Seed data for development
│   └── migrations/             # Database migration history
├── src/
│   ├── api/                    # REST API controllers
│   │   ├── admin-tasks.controller.ts
│   │   ├── admin.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── config.controller.ts
│   │   ├── events.controller.ts
│   │   ├── notifications.controller.ts
│   │   ├── points.controller.ts
│   │   ├── reports.controller.ts
│   │   └── volunteers.controller.ts
│   ├── jobs/                   # Scheduled jobs
│   │   └── event-reminders.ts
│   ├── middleware/             # Express/NestJS middleware
│   │   ├── auth.ts            # JWT authentication
│   │   └── error.ts           # Global error handling
│   ├── modules/                # NestJS modules
│   │   ├── admin-tasks.module.ts
│   │   ├── admin.module.ts
│   │   ├── auth.module.ts
│   │   ├── config.module.ts
│   │   ├── events.module.ts
│   │   ├── notifications.module.ts
│   │   ├── points.module.ts
│   │   ├── reports.module.ts
│   │   └── volunteers.module.ts
│   ├── services/               # Business logic layer
│   │   ├── activity-type.service.ts
│   │   ├── admin-task.service.ts
│   │   ├── admin.service.ts
│   │   ├── auth.service.ts
│   │   ├── badge-tier.service.ts
│   │   ├── event.service.ts
│   │   ├── leaderboard.service.ts
│   │   ├── notification.service.ts
│   │   ├── pack-config.service.ts
│   │   ├── password-reset.service.ts
│   │   ├── points.service.ts
│   │   ├── reports.service.ts
│   │   ├── signup.service.ts
│   │   ├── volunteer-role.service.ts
│   │   └── volunteer.service.ts
│   ├── utils/                  # Shared utilities
│   │   ├── prisma.ts          # Prisma client singleton
│   │   └── validation/        # Zod validation schemas
│   │       ├── activity.schema.ts
│   │       ├── admin-task.schema.ts
│   │       ├── auth.schema.ts
│   │       ├── config.schema.ts
│   │       ├── event.schema.ts
│   │       ├── points.schema.ts
│   │       ├── reports.schema.ts
│   │       └── volunteer.schema.ts
│   ├── app.module.ts           # Root application module
│   ├── main.ts                 # Application entry point
│   └── database.spec.ts        # Database integration tests
├── test/                       # E2E tests
│   ├── admin-tasks.e2e-spec.ts
│   ├── admin.e2e-spec.ts
│   ├── auth.e2e-spec.ts
│   ├── config.e2e-spec.ts
│   ├── events.e2e-spec.ts
│   ├── notifications.e2e-spec.ts
│   ├── points.e2e-spec.ts
│   ├── reports.e2e-spec.ts
│   ├── volunteers.e2e-spec.ts
│   └── jest-e2e.json
├── scripts/                    # Utility scripts
│   ├── backfill-badge-history.ts
│   ├── setup-test-db.js
│   └── setup-test-db.ps1
├── coverage/                   # Test coverage reports
├── nest-cli.json              # NestJS CLI configuration
├── tsconfig.json              # TypeScript configuration
├── tsconfig.build.json        # Build-specific TypeScript config
├── package.json               # Dependencies and scripts
├── .env.example               # Environment variables template
└── README.md                  # This file
```

---

## Architecture

### Layered Architecture

The backend follows a layered architecture pattern:

1. **Controllers** (`src/api/`): Handle HTTP requests/responses, input validation
2. **Services** (`src/services/`): Contain business logic, orchestrate database operations
3. **Middleware** (`src/middleware/`): Cross-cutting concerns (auth, error handling, logging)
4. **Database Layer** (Prisma): ORM for type-safe database access

### Key Design Principles

- **Single Responsibility**: Each service handles one domain concept
- **Dependency Injection**: NestJS DI container manages dependencies
- **Type Safety**: TypeScript and Prisma provide end-to-end type safety
- **Validation**: Zod schemas validate all incoming requests
- **Security**: bcrypt for passwords, JWT for auth, rate limiting on sensitive endpoints

### Authorization System

Three-tier authorization system:

- **Tier 1 (PARENT)**: Default tier for all volunteers
- **Tier 2 (LEADER)**: Den leaders, committee members (auto-upgraded when role assigned)
- **Tier 3 (ADMIN)**: Site administrators

Guards check tier requirements via `@RequireTier()` decorator.

### Database Schema

See `prisma/schema.prisma` for the complete data model. Key entities:

- **Volunteer**: User accounts with authentication
- **VolunteerRole**: Configurable roles (Den Leader, Committee, etc.)
- **Event**: Volunteer opportunities with activity slots
- **AdminTask**: Administrative tasks with role assignments
- **PointEvent**: Point awards and revocations
- **BadgeTierHistory**: Badge tier progression tracking
- **Notification**: In-app notification system
- **AuditLog**: Audit trail for admin actions

---

## Database Management

### Prisma Workflow

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev --name describe_your_change

# Apply migrations to production
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio

# Seed database with initial data
npx prisma db seed

# Reset database (destructive!)
npx prisma migrate reset
```

### Migrations

- Migrations are stored in `prisma/migrations/`
- Never edit migration files directly
- Always use `prisma migrate dev` to create new migrations
- Production deployments should run `prisma migrate deploy`

### Seeding

The seed script (`prisma/seed.ts`) creates:
- Default pack configuration
- Badge tier definitions
- Activity types with point values
- Volunteer roles
- Test admin user (admin@example.com / Admin123!)

**Important**: Change default admin credentials in production!

---

## Testing

### Running Tests

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Watch mode (auto-rerun on changes)
npm run test:watch

# Debug tests
npm run test:debug
```

### Test Database

**All tests (unit and E2E) use a separate test database (`test.db`) to protect your development data.**

The test isolation is configured in `test/jest.setup.ts`, which runs before any tests and sets:
- `DATABASE_URL=file:./test.db`
- Test-specific JWT secrets
- `NODE_ENV=test`

This means:
- ✅ Running tests **never affects** your `dev.db` development database
- ✅ You can safely run tests without losing development data
- ✅ Tests are fully isolated from your running development server

To set up the test database:
```bash
npm run test:setup
```

This creates `test.db`, runs migrations, and prepares it for testing.

**Important**: Tests run with `maxWorkers: 1` to prevent parallel execution issues with SQLite.

### Test Coverage

Target: 80%+ code coverage

View coverage report: `open coverage/lcov-report/index.html`

Current coverage summary: See [TEST_COVERAGE_SUMMARY.md](./TEST_COVERAGE_SUMMARY.md)

### Writing Tests

```typescript
// Unit test example
describe('PointsService', () => {
  let service: PointsService;
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PointsService, PrismaService],
    }).compile();
    
    service = module.get<PointsService>(PointsService);
  });
  
  it('should award points correctly', async () => {
    // Test implementation
  });
});

// E2E test example
describe('Auth (e2e)', () => {
  let app: INestApplication;
  
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = moduleFixture.createNestApplication();
    await app.init();
  });
  
  it('/api/auth/login (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Test123!' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('accessToken');
      });
  });
});
```

See [TESTING.md](./TESTING.md) for detailed testing guidelines.

---

## API Documentation

Complete API documentation: [/docs/api-documentation.md](../docs/api-documentation.md)

### Quick Reference

**Base URL**: `http://localhost:3001/api`

**Authentication**: Bearer token in `Authorization` header or HttpOnly cookies

**Key Endpoints**:
- `POST /api/auth/register` - Register new volunteer
- `POST /api/auth/login` - Authenticate user
- `GET /api/volunteers/me/profile` - Get current user profile
- `GET /api/events` - List events
- `POST /api/events/:eventId/slots/:slotId/signup` - Sign up for event
- `GET /api/points/me` - Get point history
- `GET /api/leaderboard` - Get leaderboard

### API Contract Tests

API contracts are defined in `/specs/001-volunteer-management/contracts/`

E2E tests validate compliance with contracts.

---

## Development Guidelines

### Code Style

- Follow TypeScript best practices
- Use ESLint for linting: `npm run lint`
- Format code with Prettier (integrated with ESLint)
- Use meaningful variable names
- Add JSDoc comments for public APIs

### Commit Messages

Follow conventional commits:
```
feat: add password reset functionality
fix: correct point calculation for recurring events
docs: update API documentation
test: add tests for volunteer service
refactor: simplify auth middleware
```

### Adding New Features

1. **Update Prisma Schema**: Add/modify models in `prisma/schema.prisma`
2. **Create Migration**: `npx prisma migrate dev --name feature_name`
3. **Generate Types**: `npx prisma generate`
4. **Create Service**: Implement business logic in `src/services/`
5. **Create Controller**: Implement HTTP handlers in `src/api/`
6. **Add Validation**: Create Zod schemas in `src/utils/validation/`
7. **Write Tests**: Add unit tests (`.spec.ts`) and E2E tests (`test/`)
8. **Update Documentation**: Update API docs and README

### Error Handling

- Use NestJS built-in exceptions (`BadRequestException`, `UnauthorizedException`, etc.)
- Custom error middleware in `src/middleware/error.ts` handles formatting
- Always return consistent error structure:
  ```json
  {
    "error": "Error message",
    "details": ["Optional array of validation errors"]
  }
  ```

### Security Checklist

- ✅ Password hashing with bcrypt (12 rounds)
- ✅ JWT token expiration (15 min access, 7-30 day refresh)
- ✅ HttpOnly cookies for tokens
- ✅ Rate limiting on sensitive endpoints
- ✅ Input validation with Zod
- ✅ CORS configuration
- ✅ Helmet middleware for security headers
- ✅ SQL injection prevention (Prisma parameterized queries)
- ✅ Audit logging for admin actions

---

## Deployment

### Production Build

```bash
# Build the application
npm run build

# The compiled output is in dist/ directory
```

### Production Environment

1. **Set Environment Variables**:
   ```env
   NODE_ENV=production
   DATABASE_URL="postgresql://user:pass@host:5432/dbname"  # Use PostgreSQL in production
   JWT_ACCESS_SECRET="<strong-random-string>"
   JWT_REFRESH_SECRET="<different-strong-random-string>"
   PORT=3001
   CORS_ORIGIN="https://yourdomain.com"
   ```

2. **Run Migrations**:
   ```bash
   npx prisma migrate deploy
   ```

3. **Start Application**:
   ```bash
   npm run start:prod
   ```

### Database Migration (SQLite → PostgreSQL)

For production, migrate from SQLite to PostgreSQL:

1. Update `DATABASE_URL` in `.env`
2. Modify `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Generate migration: `npx prisma migrate dev`
4. Deploy: `npx prisma migrate deploy`

### Docker Deployment

(Optional) Create `Dockerfile`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
```

### Health Checks

Add health check endpoint for monitoring:
```typescript
// src/app.controller.ts
@Get('/health')
health() {
  return { status: 'ok', timestamp: new Date().toISOString() };
}
```

### Monitoring

- Use PM2 for process management
- Set up logging (Winston, Pino)
- Monitor error rates
- Set up alerts for critical failures

---

## Troubleshooting

### Common Issues

**Problem**: `npx prisma db seed` exits with code 3221225477 on Windows  
**Solution**: This is a known issue with the libsql adapter on Windows. If you see all the success checkmarks (✓) before the error, the seed completed successfully. You can verify by opening Prisma Studio (`npx prisma studio`) and checking that data exists.

**Problem**: `Cannot find module '@prisma/client'`  
**Solution**: Run `npx prisma generate` to generate Prisma client

**Problem**: `Migration failed to apply`  
**Solution**: Check if database is locked. Close Prisma Studio and retry. For test DB: `rm test.db` and rerun tests.

**Problem**: `Port 3001 already in use`  
**Solution**: Change `PORT` in `.env` or kill process using port: `lsof -ti:3001 | xargs kill`

**Problem**: `JWT_ACCESS_SECRET is not defined`  
**Solution**: Ensure `.env` file exists with required variables (copy from `.env.example`)

**Problem**: Tests timeout  
**Solution**: Ensure test database is not locked. Use `maxWorkers: 1` in Jest config. Check for improper async/await usage.

**Problem**: `req.user.id undefined`  
**Solution**: Import `JWTPayload` type from auth middleware, use `req.user.userId`

### Debug Mode

Run in debug mode to attach debugger:
```bash
npm run start:debug
```

Then attach your IDE debugger to port 9229.

### Logs

Development logs are output to console. For production, configure a logging service:
- Winston for file-based logging
- CloudWatch, Datadog, or similar for cloud logging

---

## Additional Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [API Contracts](../specs/001-volunteer-management/contracts/)
- [Feature Specification](../specs/001-volunteer-management/spec.md)
- [Implementation Plan](../specs/001-volunteer-management/plan.md)
- [Quickstart Guide](../specs/001-volunteer-management/quickstart.md)

---

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes following the development guidelines
3. Write tests for new functionality
4. Ensure all tests pass: `npm test && npm run test:e2e`
5. Update documentation as needed
6. Submit a pull request

---

## License

See [LICENSE](../LICENSE) file in repository root.

---

**Last Updated**: May 3, 2026  
**Maintainers**: Development Team

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
