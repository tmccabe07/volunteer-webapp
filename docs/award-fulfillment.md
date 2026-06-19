# Award Fulfillment Guide

Award fulfillment tracks adventure awards and special awards through the pack’s purchase and distribution workflow.

## Prerequisites

- Log in at `http://localhost:3000/auth/login` with a `LEADER` account, or an `ADMIN` account if your pack uses admins for award processing.
- Open `http://localhost:3000/awards` for the main queue dashboard.
- Open `http://localhost:3000/awards/inventory` when you need to check on-hand inventory.
- Open `http://localhost:3000/awards/special` for special award records.
- If you are working a single den, you can start from `http://localhost:3000/my-dens` and jump into the den-scoped awards queue from there.

## Lifecycle

1. Eligible
2. Approved
3. Purchased
4. Distributed
5. Reconciled

## Steps

1. Sign in and open `http://localhost:3000/awards`.
2. Choose the queue you want to work first: `To Purchase`, `To Award`, or `Scoutbook Follow-up`.
3. If you need to check stock before purchasing, open `http://localhost:3000/awards/inventory`.
4. Review the purchase summary at the top of the awards page so you know how many items are needed per den and award.
5. Move one award at a time with the status button when you want to review the history, or use bulk update when you have several awards ready.
6. After distribution, switch to `Scoutbook Follow-up` and clear anything that still needs Scoutbook status updates.
7. For special awards, open `http://localhost:3000/awards/special` and handle them through the same fulfillment flow.

## Rollover Interaction

- Unfinished adventures remain on record after rollover.
- Incomplete prior-rank work is marked non-awardable so it cannot auto-create new awards later.

## Good Practices

- Confirm reconciliation before moving awards to purchase.
- Use batch transition when processing several awards together.
- Review award history before closing out a program year.
- Keep the den filter in sync with the den you are actually working so you do not purchase or distribute awards for the wrong group.