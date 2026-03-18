# Rewards System — Rewards Engine
**Date:** 2026-03-18
**Status:** Approved
**Scope:** `supabase/migrations/` + `apps/member/` — rewards engine, volunteer registration, referral system

---

## Overview

The rewards engine upgrades DEVCON+'s point system from a flat attendance counter into a full earn-and-spend loop. Members accumulate points across multiple activities (events, volunteering, referrals) and can redeem them for physical merchandise from the rewards catalog.

This feature ships three interconnected sub-systems:

1. **Dual-balance points model** — `spendable_points` tracks the redeemable balance; `lifetime_points` tracks all-time earning for tier progression and leaderboards. Both move together on earn; only `spendable_points` decreases on redemption.

2. **Volunteer registration** — Members can apply to volunteer at events. Officers approve or reject via the organizer flow. On approval, members earn a flat attendance credit (5 pts) plus a volunteer bonus (30 pts) for a total of 35 pts.

3. **Referral system** — Every profile receives a unique 8-character referral code. Sharing the code with a new signup earns the referrer 100 pts per confirmed referral, capped at 1,000 pts per calendar year.

4. **Reward redemption** — Members spend `spendable_points` to claim physical merchandise (hoodies, shirts, kits). Stock is tracked per reward; per-user annual limits prevent abuse. A `redeem_reward` SQL RPC handles the full transaction atomically.

---

## Design Decisions

| Question | Decision |
|---|---|
| Point column names | `total_points` renamed to `spendable_points`; new `lifetime_points` column added side-by-side |
| Dual-balance rationale | Tier rank and leaderboard use `lifetime_points` (never decreases); redemption deducts only `spendable_points` |
| Signup bonus | Reduced from 500 pts to 100 pts — 500 was placeholder; 100 matches the revised earning curve |
| Volunteer points | 5 pts attendance + 30 pts bonus = 35 pts total per approved application |
| Referral cap | 100 pts per referral, max 1,000 pts per referrer per calendar year (idempotent — duplicate calls are no-ops) |
| Referral code format | 8-char uppercase UUID prefix, auto-generated on INSERT via trigger |
| Reward stock | `stock_remaining` column (nullable = unlimited); decremented atomically inside `redeem_reward` RPC |
| Per-user limit | `max_per_user` column (nullable = no limit); checked against same-year redemptions |
| Redemption RPC | SECURITY DEFINER SQL function `redeem_reward(p_reward_id, p_user_id)` — atomic balance check + deduct + stock decrement + ledger insert |
| Rewards catalog | Old placeholder catalog (is_coming_soon = true) replaced with 3 real MVP items (is_coming_soon = false) |
| `manual_checkin` compatibility | Full function body re-emitted with `spendable_points` + `lifetime_points` replacing `total_points` |
| `increment_member_points` grant | SECURITY DEFINER, GRANT to `service_role` only (no `authenticated` grant — called from Edge Functions) |
| RLS on new tables | `volunteer_applications`: members read/insert own rows; officers manage all. `referrals`: referrer and referred can read their own row. |

---

## DB Schema Changes Summary

### Modified tables

**`profiles`**
- `total_points` renamed to `spendable_points`
- New column `lifetime_points integer DEFAULT 0` (back-filled from `spendable_points`)
- New column `referral_code text UNIQUE` (back-filled via `gen_random_uuid()`)
- Trigger `trg_profile_referral_code` auto-generates `referral_code` on INSERT

**`point_transactions`**
- `source` CHECK constraint updated to add `'referral'` as a valid value

**`rewards`**
- New columns: `stock_remaining integer`, `max_per_user integer`, `financial_cost_php integer`
- Catalog wiped and reseeded with 3 real items (all `is_coming_soon = false`)

**`reward_redemptions`**
- Wiped to match new catalog (via `DELETE FROM reward_redemptions` before `DELETE FROM rewards`)

### New tables

**`volunteer_applications`**
- Per-event volunteer intent: `event_id`, `user_id`, `phone_number`, `social_media_handle`, `reason`
- Status lifecycle: `pending` → `approved` / `rejected`
- Unique constraint on `(event_id, user_id)` prevents duplicate applications

**`referrals`**
- Tracks confirmed referral pairs: `referrer_id`, `referred_user_id`
- Status: `pending` / `confirmed`
- Unique constraint on `referred_user_id` — each user can only be referred once

### New / updated SQL functions

| Function | Type | Notes |
|---|---|---|
| `generate_referral_code()` | Trigger function | Auto-fills `referral_code` on profile INSERT |
| `handle_new_user()` | Trigger function (replaced) | Updated column names: `spendable_points`, `lifetime_points` |
| `award_signup_bonus()` | Trigger function (replaced) | 500 pts → 100 pts; updates both balance columns |
| `increment_member_points(uuid, int)` | RPC | Updated to increment both columns; GRANT service_role only |
| `manual_checkin(uuid, uuid)` | RPC (patched) | `total_points` → `spendable_points` + `lifetime_points` |
| `redeem_reward(uuid, uuid)` | RPC (new) | Atomic redemption: balance check, deduct, stock, ledger |
| `approve_volunteer_application(uuid, uuid)` | RPC (new) | Officer-gated; awards 35 pts on approval |
| `confirm_referral(text, uuid)` | RPC (new) | Idempotent; enforces annual cap; awards 100 pts |

---

## New Features Summary

### Volunteer Registration
- Members apply to volunteer at any event via a form (phone, social handle, reason — reason required)
- Stored in `volunteer_applications` with `pending` status
- Officers approve via `approve_volunteer_application` RPC
- On approval: member earns 35 pts (5 attendance + 30 bonus), recorded as `source = 'volunteering'`
- Rejected applications are recorded but no points awarded

### Referral System
- Each profile has a unique `referral_code` (8-char uppercase, auto-generated)
- New signups can enter a referral code during or after registration
- `confirm_referral(code, new_user_id)` is called on confirmation — idempotent, safe to call multiple times
- Referrer earns 100 pts per confirmed referral, up to 1,000 pts/year
- Self-referral is blocked at the RPC level

### Rewards Redemption
- Members spend `spendable_points` to claim catalog items
- `redeem_reward(reward_id, user_id)` handles the full transaction atomically:
  - Locks both `rewards` and `profiles` rows
  - Validates: reward active, in stock, user has sufficient balance, within annual limit
  - Deducts `spendable_points`, decrements `stock_remaining`, inserts `reward_redemptions` record, logs negative `point_transactions` entry
- `lifetime_points` is NOT decremented on redemption
- Redemption records start with status `pending` (officer claims on-site)

---

## UI Changes Summary

### XPCard — Design B
The XP card on the member dashboard should display both balances:
- **Spendable balance** (primary display) — the number of points available to redeem
- **Lifetime total** (secondary, smaller) — for tier/rank context
- The gold progress bar continues to use `lifetime_points` for tier progression

### Rewards Page — Design A
The rewards catalog page (`/rewards`) should reflect live redemption:
- Show `stock_remaining` badge on each reward card (e.g., "12 left")
- Show member's current `spendable_points` balance in the page header
- "Redeem" button calls `redeem_reward` RPC; disabled if `spendable_points < points_cost`
- On success: refresh balance + show confirmation toast
- Remove the blanket `<ComingSoonModal />` — items are now redeemable (all 3 MVP items have `is_coming_soon = false`)

---

## Verification Checklist

- [ ] Migration runs cleanly on a fresh Supabase project (no column-not-found errors)
- [ ] `profiles.spendable_points` and `profiles.lifetime_points` both equal the previous `total_points` value after migration on existing rows
- [ ] `profiles.referral_code` is non-null and unique for all existing rows after migration
- [ ] New profile INSERT automatically gets a `referral_code` (trigger test)
- [ ] New profile INSERT automatically gets signup bonus of 100 pts in `point_transactions` (trigger test)
- [ ] `manual_checkin` awards points to both `spendable_points` and `lifetime_points` (no reference to `total_points`)
- [ ] `redeem_reward` with insufficient points returns `{ success: false, error: 'Insufficient points' }`
- [ ] `redeem_reward` with out-of-stock reward returns `{ success: false, error: 'Out of stock' }`
- [ ] `redeem_reward` over annual limit returns `{ success: false, error: 'Annual limit reached' }`
- [ ] `redeem_reward` only deducts `spendable_points`, not `lifetime_points`
- [ ] `approve_volunteer_application` by a non-officer returns `{ success: false, error: 'Unauthorized' }`
- [ ] Double-approval attempt returns `{ success: false, error: 'Already reviewed' }`
- [ ] `confirm_referral` with own referral code returns `{ success: false, error: 'Cannot refer yourself' }`
- [ ] `confirm_referral` called twice for the same referred user is a no-op (returns `points_awarded: 0` on second call)
- [ ] `confirm_referral` respects 1,000 pts annual cap (awards partial amount when approaching cap)
- [ ] Rewards catalog contains exactly 3 rows after migration, all with `is_coming_soon = false`
- [ ] `point_transactions.source` accepts `'referral'` without constraint violation
- [ ] TypeScript stores updated: `total_points` references replaced with `spendable_points` / `lifetime_points`
- [ ] Supabase generated types regenerated after migration (`supabase gen types typescript`)
