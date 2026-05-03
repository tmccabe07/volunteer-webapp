# Cub Scout Volunteer Management System

A comprehensive web application for managing Cub Scout volunteers, events, badges, and points tracking. Built with modern technologies to provide an intuitive experience for pack leaders, volunteers, and parents.

## 🎯 Overview

The Cub Scout Volunteer Management System streamlines pack administration by providing:

- **Volunteer Management**: Track volunteer information, contact details, and availability
- **Event Management**: Create, manage, and track event signups with real-time availability
- **Points & Badges System**: Award and track volunteer points, badges, and achievements
- **Role-Based Access Control**: Three-tier authorization system (Parent, Leader, Admin)
- **Notifications**: Keep volunteers informed about upcoming events and opportunities
- **Reporting**: Generate insights on volunteer participation and pack activities
- **Leaderboard**: Gamify volunteering with friendly competition and recognition

## 🚀 Quick Start

For detailed setup instructions, see [docs/quickstart.md](specs/001-volunteer-management/quickstart.md)

### Prerequisites

- **Node.js**: v20.x LTS or higher
- **npm**: v10.x or higher
- **Git**: Latest version

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd volunteer-webapp

# Install backend dependencies
cd backend
npm install

# Set up database
npx prisma migrate deploy
npx prisma db seed

# Start backend server
npm run start:dev

# In a new terminal, set up frontend
cd ../frontend
npm install

# Start frontend development server
npm run dev
```

Access the application:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api

Default admin credentials:
- Email: `admin@pack123.org`
- Password: `admin123`

## 📁 Project Structure

```
volunteer-webapp/
├── backend/          # NestJS backend API
│   ├── src/
│   │   ├── api/           # REST API controllers
│   │   ├── services/      # Business logic services
│   │   ├── middleware/    # Auth, error handling, audit logging
│   │   └── modules/       # NestJS modules
│   ├── prisma/       # Database schema and migrations
│   ├── test/         # E2E tests
│   └── scripts/      # Utility scripts (setup, backup)
├── frontend/         # Next.js 14 frontend
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   ├── components/    # React components
│   │   ├── services/      # API client services
│   │   └── lib/           # Utilities and helpers
│   └── public/       # Static assets
├── docs/             # Additional documentation
└── specs/            # Feature specifications and design artifacts
    └── 001-volunteer-management/
        ├── spec.md        # Feature specification
        ├── plan.md        # Technical design
        ├── data-model.md  # Database schema
        ├── tasks.md       # Implementation tasks
        └── contracts/     # API contracts
```

## 🛠️ Technology Stack

### Backend
- **Framework**: NestJS 11.0.1 (TypeScript)
- **Database**: Prisma ORM 7.5.0 with SQLite (dev) / PostgreSQL (prod)
- **Authentication**: JWT with refresh tokens, HttpOnly cookies
- **Security**: bcrypt, Helmet, CORS, rate limiting, input sanitization
- **Validation**: Zod for schema validation
- **Testing**: Jest (unit & E2E tests)

### Frontend
- **Framework**: Next.js 14 with App Router (React 18)
- **Styling**: TailwindCSS with shadcn/ui components
- **State Management**: React hooks with server-side data fetching
- **API Client**: Fetch API with error handling
- **Testing**: Vitest with React Testing Library

## 📚 Documentation

- **[Backend README](backend/README.md)**: Backend architecture, API structure, testing
- **[Frontend README](frontend/README.md)**: Frontend architecture, component guidelines, styling
- **[API Documentation](docs/api-documentation.md)**: Complete API reference with examples
- **[Quick Start Guide](specs/001-volunteer-management/quickstart.md)**: Detailed setup instructions
- **[Testing Guide](backend/TESTING.md)**: Testing strategy and best practices
- **[Feature Specification](specs/001-volunteer-management/spec.md)**: Detailed requirements

## 🔐 Security Features

- **Password Security**: bcrypt hashing with 12 rounds, password strength requirements
- **Authentication**: JWT access tokens (15 min) + refresh tokens (7-30 days)
- **Authorization**: Three-tier system (Parent, Leader, Admin) with route guards
- **Rate Limiting**: Global and endpoint-specific rate limits to prevent abuse
- **Input Sanitization**: XSS prevention middleware for all user inputs
- **Audit Logging**: Track all Tier 2+ actions for compliance and security
- **Security Headers**: Helmet middleware for HTTP security headers
- **CORS**: Configured for frontend-backend communication

## 🧪 Testing

### Backend Tests
```bash
cd backend

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:cov
```

### Frontend Tests
```bash
cd frontend

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

**Coverage Target**: 80%+ for critical paths (authentication, authorization, data mutations)

## 📦 Deployment

### Production Environment Setup

1. **Backend**: Copy `.env.production.example` to `.env` and configure:
   - Database URL (PostgreSQL recommended)
   - JWT secrets (use strong, unique values)
   - Frontend URL for CORS
   - Email/monitoring configuration

2. **Frontend**: Copy `.env.production.example` to `.env.production.local`:
   - API URL (production backend)
   - Analytics tracking IDs (optional)
   - Feature flags

3. **Database Migration**:
   ```bash
   cd backend
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```

4. **Build & Start**:
   ```bash
   # Backend
   cd backend
   npm run build
   npm run start:prod
   
   # Frontend
   cd frontend
   npm run build
   npm start
   ```

### Deployment Platforms

- **Frontend**: Vercel, Netlify, AWS Amplify, Cloudflare Pages
- **Backend**: AWS (EC2/ECS), DigitalOcean, Heroku, Render
- **Database**: AWS RDS, DigitalOcean Managed Databases, Supabase

See deployment documentation in respective README files for detailed instructions.

## 🔄 Database Backups

Automated backup scripts are provided:

```bash
# Windows (PowerShell)
cd backend/scripts
.\backup-database.ps1 -DatabasePath "../dev.db" -KeepDays 30

# Linux/Mac (Bash)
cd backend/scripts
chmod +x backup-database.sh
./backup-database.sh ../dev.db backups 30
```

Configure automated backups using cron (Linux/Mac) or Task Scheduler (Windows).

## 🤝 Contributing

1. Create a feature branch from `main`
2. Follow existing code style and conventions
3. Write tests for new features (target 80%+ coverage)
4. Update documentation as needed
5. Submit a pull request with clear description

### Code Quality

```bash
# Linting
npm run lint

# Formatting
npm run format

# Type checking
npm run type-check
```

## 📄 License

See [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

### Common Issues

**Database Connection Errors**
- Verify `DATABASE_URL` in `.env`
- Ensure database migrations are applied: `npx prisma migrate deploy`
- Check database file permissions (SQLite)

**CORS Errors**
- Verify `FRONTEND_URL` in backend `.env` matches frontend URL
- Check browser console for specific CORS error details
- Ensure credentials are enabled in CORS configuration

**Authentication Failures**
- Clear browser cookies and try again
- Verify JWT secrets are set in backend `.env`
- Check access/refresh token expiration settings

**Port Conflicts**
- Backend default: 3001, Frontend default: 3000
- Change port in `.env` (backend) or `npm run dev -- -p <port>` (frontend)

For more troubleshooting tips, see:
- [Backend Troubleshooting](backend/README.md#troubleshooting)
- [Frontend Troubleshooting](frontend/README.md#troubleshooting)

## 📞 Support

For questions or issues:
1. Check existing documentation in `docs/` and README files
2. Review [API documentation](docs/api-documentation.md)
3. Search existing issues in the repository
4. Create a new issue with detailed description and steps to reproduce

## 🎯 Roadmap

Current implementation includes:
- ✅ Volunteer management with CRUD operations
- ✅ Event creation and signup management
- ✅ Points and badges system
- ✅ Admin tasks and role management
- ✅ Pack configuration
- ✅ Reporting and leaderboard
- ✅ Notifications system
- ✅ Audit logging

Future enhancements:
- 📧 Email notifications for events and announcements
- 📱 Mobile-responsive design improvements
- ♿ Enhanced accessibility features (WCAG 2.1 AA compliance)
- 📊 Advanced analytics dashboard
- 🔄 Real-time updates with WebSockets
- 📤 Data export functionality (CSV, PDF reports)
- 🌐 Multi-language support

## 🙏 Acknowledgments

Built for Cub Scout packs to simplify volunteer management and enhance community engagement.

Special thanks to all contributors and the Scouting community.

---

**Happy Scouting!** 🏕️
