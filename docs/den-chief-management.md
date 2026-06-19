# Den Chief Management Guide

Den Chiefs are youth leaders assigned to assist dens with visible but limited access.

## Prerequisites

- Log in at `http://localhost:3000/auth/login` with an `ADMIN` account.
- Open `http://localhost:3000/admin/config` and use `Manage Den Chiefs`, or open `http://localhost:3000/admin/den-chiefs` directly.
- Have the Den Chief’s name, email, and the den they should support ready before you create or update the assignment.

## Responsibilities

- Support den meetings.
- Help with event volunteering.
- View assigned den information without pack-wide write access.

## Steps

1. Sign in as `ADMIN` and open `http://localhost:3000/admin/den-chiefs`.
2. Create a new Den Chief record or open an existing one from the list.
3. Open `View profile` for that Den Chief, then in `Assign to Den` select a den and click `Assign`.
4. Confirm the record is still active after saving.
5. Sign out or switch to the Den Chief account or Den Leader account for the assigned Den and open `http://localhost:3000/my-dens` to verify the assigned den is visible.
6. If the Den Chief should no longer have access, close out the assignment and recheck the den list with the same account.

## Access Notes

- Den Chiefs are not full leaders.
- Their access should remain view-focused and scoped to the dens they are assigned to.
- Admins manage creation and assignment.