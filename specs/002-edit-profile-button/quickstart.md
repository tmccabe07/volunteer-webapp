# Quickstart Guide: Dashboard Profile Edit Navigation

**Feature**: 002-edit-profile-button  
**Date**: 2026-05-04  
**Estimated Time**: 1-2 hours (including tests)

## Overview

Add an "Edit Profile" button to the dashboard page that navigates directly to the profile edit page. This guide walks through the implementation step-by-step following BDD principles.

## Prerequisites

- Node.js and npm installed
- Repository cloned and dependencies installed (`npm install` in both `backend/` and `frontend/`)
- Development server running (`npm run dev` in `frontend/`)
- Familiarity with React, Next.js, and Vitest testing

## Implementation Workflow

**Follow RED-GREEN-REFACTOR**:
1. **RED**: Write failing tests first
2. **GREEN**: Implement minimal code to pass tests
3. **REFACTOR**: Clean up and improve code quality

---

## Step 1: Write Failing Tests (RED Phase)

### 1.1 Locate Test File

**File**: `frontend/src/app/dashboard/page.test.tsx`

This test file already exists and tests the dashboard page. We'll add new test cases.

### 1.2 Add Test Cases

Add these test cases to the existing `describe('DashboardPage')` block:

```tsx
describe('Profile Edit Navigation', () => {
  it('should display an Edit Profile button in the profile card', () => {
    (useRequireAuth as any).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    render(<DashboardPage />);

    const editButton = screen.getByRole('button', { name: /edit profile/i });
    expect(editButton).toBeInTheDocument();
  });

  it('should navigate to profile edit page when Edit Profile button is clicked', async () => {
    const mockPush = vi.fn();
    const mockUseRouter = vi.fn(() => ({ push: mockPush }));
    (useRouter as any).mockImplementation(mockUseRouter);

    (useRequireAuth as any).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    render(<DashboardPage />);

    const editButton = screen.getByRole('button', { name: /edit profile/i });
    await userEvent.click(editButton);

    expect(mockPush).toHaveBeenCalledWith('/profile/edit');
  });

  it('should not display Edit Profile button when user is not authenticated', () => {
    (useRequireAuth as any).mockReturnValue({
      user: null,
      isLoading: false,
    });

    const { container } = render(<DashboardPage />);

    const editButton = screen.queryByRole('button', { name: /edit profile/i });
    expect(editButton).not.toBeInTheDocument();
  });
});
```

### 1.3 Ensure Mocks Are Set Up

Verify these mocks exist at the top of the test file:

```tsx
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/lib/auth-context', () => ({
  useRequireAuth: vi.fn(),
}));
```

### 1.4 Run Tests and Verify Failure

```powershell
cd frontend
npm test dashboard/page.test.tsx
```

**Expected Result**: Tests should FAIL with message indicating "Edit Profile" button is not found.

---

## Step 2: Implement Feature (GREEN Phase)

### 2.1 Open Dashboard Page Component

**File**: `frontend/src/app/dashboard/page.tsx`

### 2.2 Import Router Hook

Add to existing imports at the top of the file:

```tsx
import { useRouter } from 'next/navigation';
```

### 2.3 Initialize Router in Component

Add this line inside the `DashboardPage` component function (near other hooks):

```tsx
const router = useRouter();
```

### 2.4 Add Button to Profile Card

Locate the "Your Profile" Card (around line 75). Add the button after the profile information display:

**Find this section**:
```tsx
<Card className="p-6">
  <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
  <div className="space-y-2 text-sm">
    <div>
      <span className="font-medium">Name:</span> {user.name}
    </div>
    <div>
      <span className="font-medium">Email:</span> {user.email}
    </div>
    {user.phone && (
      <div>
        <span className="font-medium">Phone:</span> {user.phone}
      </div>
    )}
    <div>
      <span className="font-medium">Role:</span>{' '}
      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
        {user.authTier}
      </span>
    </div>
  </div>
</Card>
```

**Add button after the closing `</div>` of `space-y-2` and before the closing `</Card>`**:

```tsx
<Card className="p-6">
  <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
  <div className="space-y-2 text-sm">
    {/* Existing profile information */}
  </div>
  
  {/* NEW: Edit Profile Button */}
  <Button
    variant="outline"
    onClick={() => router.push('/profile/edit')}
    className="mt-4 w-full"
  >
    Edit Profile
  </Button>
</Card>
```

### 2.5 Run Tests and Verify Success

```powershell
cd frontend
npm test dashboard/page.test.tsx
```

**Expected Result**: All tests should PASS.

### 2.6 Manual Testing

1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:3000/dashboard` (login if needed)
3. Verify "Edit Profile" button appears in "Your Profile" card
4. Click button and verify navigation to `/profile/edit`
5. Test on mobile viewport (responsive design)

---

## Step 3: Refactor and Document (REFACTOR Phase)

### 3.1 Review Code Quality

Check that:
- Button has clear, action-oriented label ("Edit Profile")
- Button styling is consistent with other dashboard actions (`variant="outline"`)
- Button is keyboard accessible (default Button behavior)
- Mobile-friendly spacing (`w-full` on mobile, appropriate margin)

### 3.2 Add Comments (If Needed)

If the button placement isn't obvious, add a brief comment:

```tsx
{/* Profile edit navigation - provides direct access to profile editing */}
<Button
  variant="outline"
  onClick={() => router.push('/profile/edit')}
  className="mt-4 w-full"
>
  Edit Profile
</Button>
```

**Note**: Given the clarity of the code, this comment may be unnecessary. Use judgment.

### 3.3 Verify No Duplication

Confirm that:
- Router import is not duplicated elsewhere in the file
- Button component is already imported (no new import needed)
- Navigation pattern matches existing code (consistent with other pages)

---

## Step 4: Run Full Test Suite

### 4.1 Run All Frontend Tests

```powershell
cd frontend
npm test
```

**Expected Result**: All existing tests should still pass. No regressions.

### 4.2 Run Linter

```powershell
cd frontend
npm run lint
```

**Expected Result**: No linting errors.

---

## Step 5: Verify Acceptance Criteria

Refer to [spec.md](spec.md) and manually verify:

### User Story 1 - Direct Profile Edit Access (P1)

- [x] **AC1**: Dashboard displays clearly labeled "Edit Profile" button
- [x] **AC2**: Clicking button navigates to profile edit page
- [x] **AC3**: Users can only edit their own profile (enforced by profile edit page - no changes needed here)
- [x] **AC4**: Unauthenticated users cannot access profile edit page (enforced by page-level auth - no changes needed here)

### User Story 2 - Clear Profile Edit Discoverability (P2)

- [x] **AC1**: Button is visible without scrolling (in profile card at top of dashboard)
- [x] **AC2**: Button label clearly indicates action ("Edit Profile")
- [x] **AC3**: Button is easily discoverable (located in "Your Profile" card with user information)

---

## Troubleshooting

### Test Failure: "Cannot find module 'next/navigation'"

**Solution**: Ensure mock is defined before test cases:

```tsx
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));
```

### Test Failure: "mockPush is not a function"

**Solution**: Ensure router mock returns an object with `push` method:

```tsx
const mockPush = vi.fn();
(useRouter as any).mockReturnValue({ push: mockPush });
```

### Button Not Appearing in Browser

**Checklist**:
1. Verify you're logged in (dashboard requires auth)
2. Check browser console for errors
3. Verify dev server is running (`npm run dev`)
4. Hard refresh browser (Ctrl+Shift+R) to clear cache

### Button Click Does Nothing

**Checklist**:
1. Check browser console for navigation errors
2. Verify `useRouter` is imported from `next/navigation` (not `next/router`)
3. Verify profile edit page exists at `/profile/edit`

---

## Code Diff Summary

**Files Modified**: 1  
**Files Added**: 0  
**Lines Added**: ~10 (including imports and button)  
**Lines Modified**: 0  

### frontend/src/app/dashboard/page.tsx

```diff
+ import { useRouter } from 'next/navigation';

  export default function DashboardPage() {
+   const router = useRouter();
    const { user, isLoading } = useRequireAuth();
    
    // ... existing code ...
    
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
      <div className="space-y-2 text-sm">
        {/* Existing profile info */}
      </div>
+     <Button
+       variant="outline"
+       onClick={() => router.push('/profile/edit')}
+       className="mt-4 w-full"
+     >
+       Edit Profile
+     </Button>
    </Card>
```

### frontend/src/app/dashboard/page.test.tsx

```diff
+ describe('Profile Edit Navigation', () => {
+   // Three new test cases for Edit Profile button
+ });
```

---

## Completion Checklist

- [ ] Tests written and failing (RED)
- [ ] Implementation complete and tests passing (GREEN)
- [ ] Code reviewed for quality and clarity (REFACTOR)
- [ ] Full test suite passes
- [ ] Linter passes
- [ ] Manual testing complete (desktop and mobile)
- [ ] All acceptance criteria verified
- [ ] Code committed with descriptive message

**Commit Message Example**:
```
feat(dashboard): add Edit Profile button for direct navigation

- Add Edit Profile button to Your Profile card on dashboard
- Button navigates to /profile/edit using router.push()
- Add comprehensive test coverage for button presence and navigation
- Follows existing navigation patterns from leaderboard and volunteer pages

Closes #002-edit-profile-button
```

---

## Next Steps

After implementation is complete:

1. **Create Pull Request**: Reference this feature branch (`002-edit-profile-button`)
2. **Request Review**: Ensure reviewer checks BDD compliance and constitutional principles
3. **Merge to Main**: After approval and CI passes
4. **Update Docs**: If project has user-facing documentation, add note about new dashboard feature

---

## Questions or Issues?

- Check [research.md](research.md) for detailed pattern analysis
- Review [data-model.md](data-model.md) to confirm no data changes are needed
- Refer to [plan.md](plan.md) for overall feature architecture

**Estimated Time Breakdown**:
- Write tests: 20-30 minutes
- Implement feature: 10-15 minutes
- Run tests and manual QA: 15-20 minutes
- Refactor and cleanup: 10-15 minutes

**Total**: 1-2 hours
