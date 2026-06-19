# Advancement Operations

This guide summarizes the pack-level workflows that support den advancement, roster maintenance, and year-end rollover.

## Prerequisites

- Log in at `http://localhost:3000/auth/login` with an `ADMIN` account.
- Open `http://localhost:3000/admin/config` and use the `Data Quality` card under My Pack to review cleanup items before making changes.
- Open `http://localhost:3000/admin/bulk-operations` for CSV import and rollover work.
- If you need batch details after a run, use the backend API on `http://localhost:3001/api` with the returned batch ID.
- Have the current roster CSV or year-end rollover year ready before you start.

## What It Covers

- Child roster creation and import
- Den transfer and split workflows
- Annual rank rollover
- Data quality checks
- Awardability protection during rollover

## Core Principles

- Preserve history instead of overwriting it.
- Use temporal membership records for den changes.
- Keep incomplete prior-rank adventures from being auto-awarded after rollover.
- Treat bulk admin jobs as auditable batches.

## Steps

1. Sign in as `ADMIN` and open `http://localhost:3000/admin/config`, then click `Data Quality` in the My Pack tools.
2. Run the checks and review duplicate links, stale approvals, and award reconciliation gaps.
3. Open `http://localhost:3000/admin/bulk-operations` and upload the child scout CSV if you are adding or rebuilding roster data.
4. Use the CSV import form to start the batch, then save the batch ID so you can review row-level errors later.
5. From the same bulk operations page, enter the target year and run a rollover preview.
6. Review the preview counts before you choose dry run or execute rollover.
7. After the batch finishes, open `http://localhost:3001/api/imports/{batchId}` or `http://localhost:3001/api/rollover/{batchId}` with the returned batch ID if you need to inspect errors.

## Operational Checks

- Duplicate parent-child links
- Stale approval queue items
- Award reconciliation gaps
- Transfer history for den splits

## Notes

- CSV imports are intended for admin use only.
- Rollover should be treated as a pack-admin action, even when run in dry-run mode.
- Use the den roster pages in the main app when you need to verify a target den before moving children.