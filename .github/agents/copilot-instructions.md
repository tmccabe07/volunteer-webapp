# volunteer-webapp Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-05-25

## Active Technologies
Language/runtime: TypeScript 5.x, Node.js 20.x LTS
Backend: NestJS 11.x, Prisma ORM 7.x, Zod 4.x
Frontend: Next.js 16.x, React 19.x, Tailwind CSS 4.x, Radix UI, shadcn/ui, Lucide React icons
Database: PostgreSQL (production), SQLite/libSQL (development & some production adapters), managed via Prisma ORM and migrations

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
- 010-plan-md-spec: Added TypeScript 5.x (Node.js 20.x LTS, Next.js 16.1.6) + NestJS 11.x, Prisma ORM 7.5.0, React 19.2.3, Radix UI, Tailwind CSS, Zod validation
- 008-event-time-enhancements: Added TypeScript 5 (backend and frontend) + Backend - NestJS 11.0.1, Prisma 7.5.0, Zod 4.3.6; Frontend - Next.js 16.1.6, React 19.2.3, Radix UI
- 007-ui-design-enhancements: Added TypeScript 5.x (frontend), Node.js/NestJS (backend - no changes) + Next.js 14+, React 18+, Tailwind CSS 3.x, shadcn/ui, Radix UI primitives, Lucide React icons
- 006-retroactive-event-credit: Added TypeScript (Node.js 20+) + NestJS 11.x (backend), Next.js 16.x + React 19.x (frontend), Prisma 7.x (ORM)
- 005-dashboard-upcoming-tasks: Added TypeScript 5.x (both frontend and backend) + Backend: NestJS 11, Prisma 7.5; Frontend: Next.js 16, React 19, Tailwind CSS 4
- 002-edit-profile-button: Added TypeScript 5.x, Node.js (via NestJS backend, Next.js 16 frontend) + Next.js 16, React 19, NestJS 11, Prisma 7, Radix UI, TailwindCSS


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
