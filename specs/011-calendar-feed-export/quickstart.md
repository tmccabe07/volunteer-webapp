# Quickstart: Calendar Subscription Feed Export

## Goal
Implement and validate scoped iCalendar subscription feeds (pack + den) with secure token lifecycle and immediate revocation behavior.

## Prerequisites
- Backend dependencies installed in backend/
- Database migration workflow available via Prisma
- Test database configured per backend/TESTING.md

## 1. Apply schema changes
1. Add calendar feed token model and related enums to Prisma schema.
2. Create migration:
   - from backend/: npx prisma migrate dev --name add_calendar_feed_tokens
3. Regenerate Prisma client:
   - from backend/: npx prisma generate

## 2. Implement backend services
1. Add feed token service for:
   - Create/get pack token
   - Create/get den token per accessible den
   - Regenerate token for a single scope
   - Revoke tokens on access loss and pack departure
2. Add feed rendering service:
   - Query visible events by scope
   - Map to iCalendar events
   - Return text/calendar response

## 3. Add API endpoints
1. Public feed endpoint:
   - GET /api/calendar/feeds/:feedToken.ics
2. Authenticated management endpoints:
   - GET /api/me/calendar-feeds
   - POST /api/me/calendar-feeds/regenerate

## 4. Update profile UI
1. Add calendar feed section to profile/settings.
2. Show:
   - one pack link
   - one link per accessible den
3. Use den name only in den-scoped calendar labels.
4. Add explanatory text:
   - updates are automatic
   - refresh cadence is controlled by provider and may take hours

## 5. Write tests first (BDD/constitution compliance)
1. Contract tests
   - valid token returns text/calendar payload
   - invalid/revoked token denied with no user leakage
2. Integration/e2e tests
   - pack vs den scope isolation
   - den access removal revokes only affected den token
   - leaving pack revokes pack + all den tokens
   - no manual re-subscribe required for routine event changes
3. Unit tests
   - token hashing
   - regeneration behavior
   - annual den rank rollover leaves den tokens stable when den identity unchanged

## 6. Verify locally
1. Type check:
   - from backend/: npx tsc -p tsconfig.build.json --noEmit
2. Test run:
   - from backend/: npm run test
   - from backend/: npm run test:e2e
3. Manual sanity check:
   - copy generated feed URL and confirm it imports in Google Calendar via From URL.
4. Endpoint smoke checks:
   - GET /api/me/calendar-feeds (authenticated) returns one PACK feed and zero-or-more DEN feeds
   - GET /api/calendar/feeds/:feedToken.ics returns text/calendar payload for active token
   - POST /api/me/calendar-feeds/regenerate rotates only the requested scope token

## 7. Operational notes
- Google Calendar pulls feeds periodically (often 8-24 hours).
- Backend does not push updates to Google.
- Token regeneration or access loss revocation invalidates previously shared links immediately.
- Include ICS reminder metadata as best effort, but document that Google subscription calendars may ignore feed-level reminders.
- Provide user guidance to configure calendar-level default notifications in Google Calendar for reliable reminders.
- Feed endpoint is rate limited and returns no-cache headers for safer public token handling.
