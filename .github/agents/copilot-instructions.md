# volunteer-webapp Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-12

## Active Technologies
- TypeScript 5.x, Node.js (via NestJS backend, Next.js 16 frontend) + Next.js 16, React 19, NestJS 11, Prisma 7, Radix UI, TailwindCSS (002-edit-profile-button)
- PostgreSQL (via Prisma ORM) (002-edit-profile-button)
- TypeScript 5.x (both frontend and backend) + Backend: NestJS 11, Prisma 7.5; Frontend: Next.js 16, React 19, Tailwind CSS 4 (005-dashboard-upcoming-tasks)
- Prisma ORM with libSQL adapter (SQLite-compatible), existing AdminTask and TaskCompletion models (005-dashboard-upcoming-tasks)
- TypeScript (Node.js 20+) + NestJS 11.x (backend), Next.js 16.x + React 19.x (frontend), Prisma 7.x (ORM) (006-retroactive-event-credit)
- SQLite with Prisma ORM (libSQL adapter for production) (006-retroactive-event-credit)

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
- 006-retroactive-event-credit: Added TypeScript (Node.js 20+) + NestJS 11.x (backend), Next.js 16.x + React 19.x (frontend), Prisma 7.x (ORM)
- 005-dashboard-upcoming-tasks: Added TypeScript 5.x (both frontend and backend) + Backend: NestJS 11, Prisma 7.5; Frontend: Next.js 16, React 19, Tailwind CSS 4
- 002-edit-profile-button: Added TypeScript 5.x, Node.js (via NestJS backend, Next.js 16 frontend) + Next.js 16, React 19, NestJS 11, Prisma 7, Radix UI, TailwindCSS


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
