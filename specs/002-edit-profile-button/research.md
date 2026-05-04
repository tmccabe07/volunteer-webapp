# Research: Dashboard Profile Edit Navigation

**Feature**: 002-edit-profile-button  
**Date**: 2026-05-04  
**Status**: Complete

## Purpose

Document existing patterns, best practices, and technical decisions for implementing profile edit navigation from the dashboard page. Since this feature leverages established patterns in the codebase, research focuses on documenting those patterns rather than exploring new approaches.

---

## Navigation Pattern Research

### Decision: Use Next.js `useRouter` with `router.push()`

**Rationale**: This is the established pattern in the codebase for programmatic navigation.

**Evidence from Codebase**:
```tsx
// From frontend/src/app/volunteers/[id]/page.tsx (line 85)
<Button onClick={() => router.push('/profile/edit')}>
  Edit Profile
</Button>

// From frontend/src/app/leaderboard/page.tsx (line 145)
<Button variant="outline" onClick={() => router.push('/profile/edit')}>
  Edit My Profile
</Button>
```

**Alternatives Considered**:
- `Link` component from `next/link`: Preferred for anchor-based navigation, but Button with onClick is the established pattern for action buttons in this codebase
- `window.location.href`: Not idiomatic in Next.js, breaks client-side routing

**Conclusion**: Use `router.push('/profile/edit')` within Button onClick handler to maintain consistency with existing code.

---

## UI Component Selection

### Decision: Use Radix UI `Button` component

**Rationale**: Project uses Radix UI as its component library, and Button component is already imported and used in dashboard page.

**Evidence from Codebase**:
```tsx
// From frontend/src/app/dashboard/page.tsx
import { Button } from '@/components/ui/button';
// Already in use on dashboard for navigation links
```

**Best Practices**:
- Use semantic button variants (`variant="outline"` for secondary actions, default for primary)
- Include accessible labels (button text should be action-oriented: "Edit Profile")
- Ensure mobile-friendly touch targets (Radix UI handles this by default)

**Conclusion**: Reuse existing `Button` component from `@/components/ui/button` with appropriate variant styling.

---

## Button Placement Strategy

### Decision: Add button to "Your Profile" Card on dashboard

**Rationale**: The dashboard already has a "Your Profile" card displaying user information. Adding the edit button here creates logical proximity between profile data and the edit action.

**Evidence from Codebase**:
```tsx
// From frontend/src/app/dashboard/page.tsx (lines 75-95)
<Card className="p-6">
  <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
  <div className="space-y-2 text-sm">
    {/* User profile information display */}
  </div>
</Card>
```

**UX Considerations**:
- Profile information is already visible, making edit action discoverable
- Consistent with other pages where "Edit Profile" appears near profile data (volunteer detail page, leaderboard)
- Mobile-first responsive layout already exists

**Conclusion**: Add button at the bottom of the "Your Profile" card content, maintaining existing spacing and styling patterns.

---

## Authentication & Authorization

### Decision: No additional auth checks needed

**Rationale**: Dashboard page already requires authentication via `useRequireAuth()` hook. Profile edit page has its own auth guards. No additional authorization needed for this feature.

**Evidence from Codebase**:
```tsx
// From frontend/src/app/dashboard/page.tsx
const { user, isLoading } = useRequireAuth();

// From frontend/src/app/profile/edit/page.tsx
const { user, isLoading: authLoading } = useAuth();
// Has redirect logic: if (!authLoading && !user) { router.push('/auth/login'); }
```

**Security Model**:
- All authenticated volunteers can edit their own profile (no tier restrictions)
- Profile edit page enforces that users can only edit their own data (server-side validation)
- Session expiration handled by existing middleware

**Conclusion**: No new auth logic required. Button can be displayed to all authenticated users on dashboard.

---

## Testing Strategy

### Decision: Follow BDD with Vitest + Testing Library

**Rationale**: Frontend uses Vitest with Testing Library for component testing. Dashboard page already has test file (`page.test.tsx`) following this pattern.

**Test Requirements** (from spec acceptance criteria):
1. Button presence and labeling
2. Button click triggers navigation to `/profile/edit`
3. Button only visible to authenticated users
4. Session expiration handling (inherited from page-level auth)

**Existing Test Pattern**:
```tsx
// From frontend/src/app/dashboard/page.test.tsx
describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRequireAuth as any).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });
  });
  // Tests for authenticated and loading states
});
```

**Test Implementation Plan**:
- Add new test case for "Edit Profile" button presence
- Mock `router.push` and verify it's called with `/profile/edit` on button click
- Verify button not rendered when user is not authenticated

**Conclusion**: Extend existing test file with new test cases following established mocking and assertion patterns.

---

## Accessibility Considerations

### Decision: Ensure semantic HTML and keyboard navigation

**Rationale**: Application already follows accessibility best practices with Radix UI components.

**Best Practices for This Feature**:
- Button text is clear and action-oriented ("Edit Profile")
- Button is keyboard accessible (Radix UI Button handles this)
- Focus states are visible (handled by Radix UI and TailwindCSS)
- Screen reader announces button purpose correctly (semantic button element)

**Conclusion**: Standard Button component usage provides necessary accessibility. No custom ARIA needed.

---

## Styling & Responsive Design

### Decision: Use TailwindCSS utility classes consistent with dashboard

**Rationale**: Project uses TailwindCSS v4 for styling. Dashboard components already use utility classes for spacing, sizing, and responsive breakpoints.

**Existing Pattern**:
```tsx
// Card layout with padding and responsive grid
<Card className="p-6">
  <div className="space-y-2 text-sm">
    {/* Content with consistent spacing */}
  </div>
</Card>
```

**Styling Guidelines**:
- Use `mt-4` or similar for top margin to separate button from profile info
- Consider `w-full` for full-width button on mobile, or default width for desktop
- Use variant="outline" to distinguish from primary dashboard actions

**Conclusion**: Apply minimal utility classes for spacing, let Card and Button components handle the rest.

---

## Implementation Summary

**Technology Stack Confirmed**:
- Next.js 16 (App Router with client components)
- React 19 with hooks (`useRouter`)
- Radix UI Button component
- TailwindCSS for styling
- Vitest + Testing Library for testing

**No Unknowns Remaining**: All technical decisions are based on established patterns in the codebase. Implementation is straightforward UI enhancement with no new architectural concerns.

**Next Steps**: Proceed to Phase 1 (Design & Contracts) to document data model (minimal), interface contracts (N/A for internal UI), and create quickstart guide.
