# Research: Calendar Subscription Feed Export

**Feature**: `011-calendar-feed-export` | **Date**: 2026-06-19

## Decision 1: Generate iCalendar feeds server-side with ical-generator

**Decision**: Use ical-generator in the backend to produce text/calendar responses for feed URLs.

**Rationale**:
- Produces RFC-compatible iCalendar output with less custom formatting risk.
- Fits existing NestJS service/controller architecture.
- Supports mapping existing event fields (title, date/time, location, description) with low implementation friction.

**Alternatives considered**:
- Hand-build ICS text templates: rejected due to higher format bug risk and escaping complexity.
- Publish downloadable one-time .ics files: rejected because subscriptions need pull-based updates.

## Decision 2: Use opaque, high-entropy per-scope feed tokens and store only token hashes

**Decision**: Issue 32-byte random hex tokens per scope (pack or den), store SHA-256 token hashes in the database, and resolve inbound tokens by hash lookup.

**Rationale**:
- Aligns with existing secure token pattern already used for password reset tokens.
- Limits exposure if database contents are leaked.
- Supports immediate revocation/rotation without changing endpoint shape.

**Alternatives considered**:
- Store raw tokens directly: rejected for avoidable credential exposure risk.
- Signed JWT-like feed tokens: rejected as unnecessary complexity for revocable long-lived links.

## Decision 3: One stable feed token per user+scope, with explicit invalidation rules

**Decision**: Maintain distinct feed tokens for:
- pack scope (one per user)
- den scope (one per user per den)

Apply invalidation rules from specification clarifications:
- Remove den access -> immediately revoke that den token.
- User leaves pack -> immediately revoke pack token and all den tokens.
- Regenerate scope token -> revoke only that scope's prior token.
- Rank rollover without den identity change -> keep den token stable.

**Rationale**:
- Matches product privacy and least-privilege requirements.
- Preserves stable links when den identity persists across annual rollover.
- Avoids forcing unnecessary user re-subscriptions.

**Alternatives considered**:
- Single combined token for all scopes: rejected due to poorer scope isolation and revocation granularity.
- Time-based forced annual token rotation: rejected because it creates avoidable user churn.

## Decision 4: Expose one public feed endpoint and authenticated management endpoints

**Decision**: Define API surface as:
- Public pull endpoint: GET /api/calendar/feeds/{feedToken}.ics
- Authenticated link discovery endpoint: GET /api/me/calendar-feeds
- Authenticated token regeneration endpoint: POST /api/me/calendar-feeds/regenerate

**Rationale**:
- Public endpoint is required for Google Calendar URL subscription.
- Authenticated endpoints let users copy links and rotate compromised scope links safely.
- Keeps responsibilities explicit and testable for contract/e2e tests.

**Alternatives considered**:
- Public endpoint with query parameters for scope selection: rejected because links should be fully opaque and immutable per scope.
- Per-user ID public endpoint (without token): rejected for enumeration and privacy risk.

## Decision 5: Scope filtering must reuse existing role/den visibility model

**Decision**: Build feed event selection using current event scope model:
- Pack feed includes visible pack-wide events.
- Den feed includes only events for that specific den.
- Only future/current events (date >= today) are exported.

**Rationale**:
- Reuses proven role/den access semantics from existing event APIs.
- Ensures calendar views do not over-expose cross-scope event data.

**Alternatives considered**:
- Export all events linked to user historically: rejected due to stale and unauthorized data risk.
- Ignore event scope and rely on client filtering: rejected because feed consumers are external systems.

## Decision 6: Sync behavior is pull-only with provider-controlled cadence

**Decision**: Treat synchronization as passive pull by calendar providers; include user guidance that updates can take 8-24 hours depending on provider cadence.

**Rationale**:
- Matches Google Calendar subscription model.
- Prevents support confusion about real-time expectations.

**Alternatives considered**:
- Push notifications/webhooks to Google: rejected (not supported for this use case and adds OAuth complexity).
- Require user manual refresh/re-subscribe: rejected by product requirement (no ongoing user action).

## Decision 7: Test strategy follows BDD-first and contract-first gates

**Decision**:
- Add contract tests for endpoint behavior and response formats.
- Add service/unit tests for token lifecycle and revocation logic.
- Add integration/e2e tests for scope isolation and revoked-token denial.

**Rationale**:
- Required by constitution principle I (BDD first, contract tests required).
- Reduces regression risk around sensitive authorization and token invalidation behavior.

**Alternatives considered**:
- Manual validation only with Google Calendar: rejected as insufficient for repeatable CI quality gates.
