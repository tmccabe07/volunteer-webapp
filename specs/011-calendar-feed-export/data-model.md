# Data Model: Calendar Subscription Feed Export

## Entity: CalendarFeedToken

Represents one subscription credential for one user and one scope.

### Fields
- id: string (cuid, primary key)
- volunteerId: string (FK -> Volunteer.id)
- scopeType: enum (PACK, DEN)
- denId: string nullable (FK -> Den.id, required when scopeType=DEN)
- tokenHash: string (SHA-256 hash of issued opaque token)
- tokenPrefix: string (short non-sensitive prefix for audit/debug UI)
- status: enum (ACTIVE, REVOKED)
- revokedReason: enum nullable (USER_REGENERATED, ACCESS_REMOVED, LEFT_PACK, ADMIN_REVOKED)
- lastAccessedAt: datetime nullable
- createdAt: datetime
- updatedAt: datetime
- revokedAt: datetime nullable

### Validation rules
- tokenHash must be unique.
- (volunteerId, scopeType, denId, status=ACTIVE) must have at most one active row.
- denId must be null for PACK scope and non-null for DEN scope.
- DEN token creation requires current user access to that den.

### Relationships
- Many CalendarFeedToken -> one Volunteer
- Many CalendarFeedToken (DEN scope) -> one Den

### State transitions
- ACTIVE -> REVOKED on explicit regeneration for same scope.
- ACTIVE -> REVOKED on den access removal (den scope tokens).
- ACTIVE -> REVOKED on user leaving pack (pack token and all den tokens).
- REVOKED is terminal for historical records; replacement token is a new row.

## Entity: CalendarFeedDescriptor

User-facing representation of a subscription link shown in profile/settings UI.

### Fields
- scopeType: enum (PACK, DEN)
- denId: string nullable
- displayName: string (Pack name for pack scope; Den name only for den scope)
- feedUrl: string (opaque URL containing raw token)
- isActive: boolean
- lastAccessedAt: datetime nullable

### Validation rules
- displayName for DEN must exclude rank labels to remain stable across yearly rollover.
- feedUrl must map to an ACTIVE CalendarFeedToken.

### Relationships
- Derived from CalendarFeedToken and related Volunteer/Den context.

## Entity: CalendarFeedEventProjection

Read-model projection used to transform internal Event records into iCalendar VEVENT entries.

### Fields
- eventId: string
- scopeType: enum (PACK_WIDE, DEN)
- matchingDenId: string nullable
- title: string
- description: string nullable
- location: string nullable
- startAt: datetime
- endAt: datetime nullable
- allDay: boolean
- isCanceled: boolean
- updatedAt: datetime

### Validation rules
- startAt required.
- endAt optional; when present it must be >= startAt.
- Records must satisfy token scope and user visibility constraints.

### Relationships
- Derived from Event + EventTargetDen + Den access filters.

## Entity: FeedAccessAudit (optional but recommended)

Tracks pull usage and denied access for monitoring and abuse analysis.

### Fields
- id: string
- tokenId: string nullable (if resolved)
- outcome: enum (SUCCESS, INVALID_TOKEN, REVOKED_TOKEN, FORBIDDEN_SCOPE)
- requestedAt: datetime
- requesterIpHash: string nullable
- userAgent: string nullable

### Validation rules
- outcome required.
- tokenId nullable to allow invalid token attempts.

### Relationships
- Many FeedAccessAudit -> one CalendarFeedToken (optional)
