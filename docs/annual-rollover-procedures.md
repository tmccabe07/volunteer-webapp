# Annual Rollover Procedures

Use the annual rollover workflow at the end of the scouting year to advance dens and children to the next rank.

## Prerequisites

- Log in at `http://localhost:3000/auth/login` with an `ADMIN` account.
- Open `http://localhost:3000/admin/bulk-operations` in the browser.
- Review `http://localhost:3000/admin/data-quality` first so you know whether there are unresolved issues to fix before rollover.
- Keep the backend batch URL handy at `http://localhost:3001/api/rollover/{batchId}` so you can inspect the result after execution.
- Decide whether you are doing a preview, a dry run, or a real execute.

## Before You Start

- Review the data-quality dashboard.
- Confirm den splits and transfers are complete.
- Make sure unresolved approvals are expected and documented.

## Steps

1. Open `http://localhost:3000/admin/bulk-operations` and enter the target rollover year.
2. Click `Preview rollover` first.
3. Check the preview summary for total dens, total children, and the den-by-den rank changes.
4. If you only want to verify the job, leave `Dry run only` checked and queue the batch.
5. If the preview looks correct, clear `Dry run only` and run the real rollover.
6. Save the returned batch ID and reopen `http://localhost:3001/api/rollover/{batchId}` if you need to inspect errors.
7. If a child-level error appears, repair the underlying record before rerunning.

## Important Behavior

- AOL dens are closed out during rollover.
- Children advance one rank at a time.
- Incomplete prior-rank adventures stay on record but are not awardable.

## Recovery

- Use the rollover batch ID to inspect results.
- Investigate and repair any child-level errors before rerunning.
- If the batch completed with errors, do not rerun until you understand which children failed and why.