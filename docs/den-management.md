# Den Management Guide

Den management centers on preserving roster history while allowing the pack to reorganize around annual rank changes.

## Prerequisites

- Log in at `http://localhost:3000/auth/login` with a `LEADER` account for day-to-day roster work or an `ADMIN` account for creating dens.
- Open `http://localhost:3000/my-dens` to work from your assigned den list.
- Open `http://localhost:3000/dens` if you need the full den list or want to create a new den as an admin.
- For transfer and batch assignment work, use the admin `transfer-child` and `batch-assign` endpoints.
- Have the target den number and rank ready before you move anyone.

## Key Concepts

- A den number is persistent across years.
- The den rank advances each program year.
- A child can have multiple historical memberships, but only one current membership at a time.

## Steps

1. Sign in and open `http://localhost:3000/my-dens` to confirm which den(s) you can work with.
2. If you are an admin creating or reviewing dens, open `http://localhost:3000/dens` and use the list to inspect the existing roster setup.
3. Open the roster page for the target den at `http://localhost:3000/dens/{id}/roster` to verify the current members before you move anyone.
4. If you are splitting a den, collect the child IDs and target den IDs first so the transfer or batch assignment stays consistent.
5. Use the admin `transfer-child` or `batch-assign` endpoint when the change needs to preserve membership history.
6. Reopen the den roster after the change to confirm the active membership is correct.

## Split Guidance

- Prefer batch assignment when moving more than a handful of children.
- Use an effective date when the change should take effect in the past.
- Keep a reason string for traceability.

## Guardrails

- A child’s rank must match the target den rank.
- Do not delete a den that still has active members.
- Preserve membership history by closing old records instead of removing them.
- If you are unsure whether a child belongs in a target den, confirm the rank on the roster page before moving the membership.