# volunteer-webapp Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-12

## Active Technologies
- TypeScript 5.x, Node.js (via NestJS backend, Next.js 16 frontend) + Next.js 16, React 19, NestJS 11, Prisma 7, Radix UI, TailwindCSS (002-edit-profile-button)
- PostgreSQL (via Prisma ORM) (002-edit-profile-button)
- TypeScript 5.x (both frontend and backend) + Backend: NestJS 11, Prisma 7.5; Frontend: Next.js 16, React 19, Tailwind CSS 4 (005-dashboard-upcoming-tasks)
- Prisma ORM with libSQL adapter (SQLite-compatible), existing AdminTask and TaskCompletion models (005-dashboard-upcoming-tasks)
- TypeScript 5.x (frontend), Node.js/NestJS (backend - no changes) + Next.js 14+, React 18+, Tailwind CSS 3.x, shadcn/ui, Radix UI primitives, Lucide React icons (007-ui-design-enhancements)
- N/A (no data model changes) (007-ui-design-enhancements)
- TypeScript 5 (backend and frontend) + Backend - NestJS 11.0.1, Prisma 7.5.0, Zod 4.3.6; Frontend - Next.js 16.1.6, React 19.2.3, Radix UI (008-event-time-enhancements)
- SQLite (development), PostgreSQL (production) with Prisma ORM (008-event-time-enhancements)

- Node.js 20.x LTS (backend), TypeScript 5.x (both frontend and backend) (001-volunteer-management)

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
- 008-event-time-enhancements: Added TypeScript 5 (backend and frontend) + Backend - NestJS 11.0.1, Prisma 7.5.0, Zod 4.3.6; Frontend - Next.js 16.1.6, React 19.2.3, Radix UI
- 007-ui-design-enhancements: Added TypeScript 5.x (frontend), Node.js/NestJS (backend - no changes) + Next.js 14+, React 18+, Tailwind CSS 3.x, shadcn/ui, Radix UI primitives, Lucide React icons
- 005-dashboard-upcoming-tasks: Added TypeScript 5.x (both frontend and backend) + Backend: NestJS 11, Prisma 7.5; Frontend: Next.js 16, React 19, Tailwind CSS 4


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
