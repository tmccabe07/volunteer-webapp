# volunteer-webapp Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-05-25

## Active Technologies
Language/runtime: TypeScript 5.x, Node.js 20.x LTS
Backend: NestJS 11.x, Prisma ORM 7.x, Zod 4.x
Frontend: Next.js 16.x, React 19.x, Tailwind CSS 4.x, Radix UI, shadcn/ui, Lucide React icons
Database: PostgreSQL (production), SQLite/libSQL (development & some production adapters), managed via Prisma ORM and migrations
- TypeScript 5.x (Node.js 20.x runtime, NestJS 11 backend, Next.js/React frontend) + NestJS, Prisma ORM, Zod validation, ical-generator (new), jsonwebtoken/cookie auth stack (011-calendar-feed-export)
- Prisma-managed relational DB (SQLite in development, production relational deployment) (011-calendar-feed-export)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test; npm run lint

## Code Style

Node.js 20.x LTS (backend), TypeScript 5.x (both frontend and backend): Follow standard conventions

## Recent Changes
- 011-calendar-feed-export: Added TypeScript 5.x (Node.js 20.x runtime, NestJS 11 backend, Next.js/React frontend) + NestJS, Prisma ORM, Zod validation, ical-generator (new), jsonwebtoken/cookie auth stack
- 010-plan-md-spec: Added TypeScript 5.x (Node.js 20.x LTS, Next.js 16.1.6) + NestJS 11.x, Prisma ORM 7.5.0, React 19.2.3, Radix UI, Tailwind CSS, Zod validation
- 008-event-time-enhancements: Added TypeScript 5 (backend and frontend) + Backend - NestJS 11.0.1, Prisma 7.5.0, Zod 4.3.6; Frontend - Next.js 16.1.6, React 19.2.3, Radix UI


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
