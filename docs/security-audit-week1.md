# DEVCON+ Security Audit — Week 1 Report
> **Date:** April 2, 2026
> **Auditor:** Claude Code (Opus 4.6) + AgentShield
> **Scope:** Full codebase — `.claude/` config, auth flows, Edge Functions, RLS, client-side validation
> **Deadline Context:** April Week 1 (Cohort 3 Graduation)

---

## Executive Summary

| Scan | Grade | Score |
|------|-------|-------|
| **AgentShield (.claude/ config)** | **B** | 88/100 |
| **Application Security (manual)** | **C+** | ~68/100 |

**Total findings: 27** (2 CRITICAL, 7 HIGH, 10 MEDIUM, 8 LOW/INFO)

The `.claude/` configuration is well-secured (no leaked secrets, good deny list, proper plugin scoping). The application layer has real vulnerabilities — primarily around client-only validation, QR scanner error handling, and missing server-side authorization guards.

---

## Part A: AgentShield Config Scan

**Grade: B (88/100) — 8 findings across 8 files**

| Category | Score |
|----------|-------|
| Secrets | 100/100 |
| Permissions | 91/100 |
| Hooks | 100/100 |
| MCP Servers | 100/100 |
| Agents | 50/100 |

### HIGH — Destructive SQL in Agent Definition (False Positive x2)

- **File:** `.claude/agents/SECURITY_AGENT.md` (lines 109, 228)
- **Finding:** `DROP TABLE` detected in agent definition
- **Verdict:** **False positive** — these are documentation examples inside the security agent's own SQL injection prevention checklist. No action needed.

### MEDIUM — No PreToolUse Security Hooks

- **Files:** `settings.json`, `settings.local.json`
- **Finding:** No PreToolUse hooks configured to intercept dangerous operations before execution
- **Recommendation:** Add hooks to catch destructive Bash commands pre-execution

### MEDIUM — Large Agent Definitions (x4)

- **Files:** `DEV_ONBOARDING_AGENT.md` (10.6k chars), `PM_AGENT.md` (7.1k), `QA_AGENT.md` (14.4k), `SECURITY_AGENT.md` (13.8k)
- **Finding:** Large agent definitions could hide malicious instructions
- **Verdict:** Reviewed — content is legitimate. No hidden injection patterns.

---

## Part B: Application Security Review

### CRITICAL Findings

#### C1. Insecure Token Storage (localStorage)
- **File:** `apps/member/src/lib/supabase.ts` — lines 4-32
- **Issue:** Supabase client stores auth/refresh tokens in browser localStorage (default persistSession: true). Any XSS vulnerability allows full session hijack.
- **Impact:** Complete account takeover if XSS is achieved
- **Fix:** This is a Supabase JS SDK limitation. Mitigate with strict CSP headers (already enforced), input sanitization, and verify PKCE flow is enabled.

#### C2. Rate Limit Edge Function Fails Open
- **File:** `check-rate-limit` Edge Function + `apps/member/src/stores/useAuthStore.ts` — callRateLimit() helper
- **Issue:** When the rate limit RPC errors, the function returns `{ allowed: true }` — an attacker can force errors to bypass all rate limiting.
- **Impact:** Unlimited login/signup brute-force attempts
- **Fix:** Change fail-open to fail-closed: return `{ allowed: false }` on any RPC error.

---

### HIGH Findings

#### H1. Client-Side-Only Rate Limiting on Login
- **File:** `apps/member/src/pages/auth/SignIn.tsx` — lines 52-91
- **Issue:** failedAttempts and lockedUntil stored in React refs — trivially bypassed by clearing page state, using curl, or disabling JS.
- **Fix:** Server-side rate limiting must be the primary gate. Client-side is UX only.

#### H2. QR Scanner Lock Not Released on Error
- **File:** `apps/member/src/pages/organizer/scan/QRScanner.tsx` — lines 167-243
- **Issue:** When supabase.functions.invoke() throws, isProcessingRef.current stays true, permanently locking the scanner until page refresh.
- **Fix:** Wrap in try/finally to always release the processing lock.

#### H3. No Client-Side Token Format Validation Before API Call
- **File:** `apps/member/src/pages/organizer/scan/QRScanner.tsx` — handleScannedToken()
- **Issue:** Arbitrary strings from QR codes are sent directly to the Edge Function without format validation.
- **Fix:** Add JWT format regex check before invoking the API.

#### H4. Email Enumeration via Rate Limit Timing
- **File:** `supabase/functions/check-rate-limit/index.ts` — lines 118-132
- **Issue:** Different rate-limit responses for registered vs unregistered emails can reveal account existence.
- **Fix:** Normalize response timing; apply consistent rate limiting regardless of email existence.

#### H5. Cross-Chapter Registration — Client-Side Only Guard
- **File:** `apps/member/src/pages/events/EventRegister.tsx` — lines 20-24
- **Issue:** Chapter-lock validation is only in the React component. Direct API calls bypass it entirely.
- **Fix:** Add RLS policy or Edge Function check enforcing chapter match for locked events.

#### H6. Missing Chapter-Lock Check in generate-qr-token
- **File:** `supabase/functions/generate-qr-token/index.ts` — lines 99-122
- **Issue:** QR token can be generated for a chapter-locked event by a member from a different chapter.
- **Fix:** Check events.is_chapter_locked + profiles.chapter_id match before generating token.

#### H7. Error Messages Leak Token Expiry Status
- **File:** `supabase/functions/award-points-on-scan/index.ts` — line 101
- **Issue:** Response differentiates token_expired vs invalid_token, giving attackers timing information.
- **Fix:** Return generic invalid_token for all validation failures.

---

### MEDIUM Findings

#### M1. CORS Origins Include localhost
- **Files:** All Edge Functions
- **Issue:** http://localhost:5173 in CORS allowlist enables local-network attacks.
- **Fix:** Move to environment variable; strip localhost in production.

#### M2. Explicit apikey Header Redundant
- **File:** `apps/member/src/stores/useAuthStore.ts` — lines 14-19
- **Issue:** Anon key passed in explicit header, redundant with Supabase client.
- **Fix:** Remove explicit apikey header from callRateLimit().

#### M3. No Zod Validation on URL Params
- **File:** `apps/member/src/pages/events/EventRegister.tsx` — lines 7-43
- **Issue:** slug param from URL used directly without validation.
- **Fix:** Add Zod schema for URL parameters.

#### M4. Organizer Code Regex Mismatch
- **File:** `apps/member/src/pages/profile/ProfileEdit.tsx` — lines 176-180
- **Issue:** Client regex allows hyphens; backend does .toUpperCase() — slight mismatch.
- **Fix:** Align client and server validation.

#### M5. Session Fixation via Dynamic Redirect URLs
- **Files:** `apps/member/src/pages/auth/SignUp.tsx`, `apps/member/src/stores/useAuthStore.ts`
- **Issue:** window.location.origin used for email redirect URLs. If opened from phishing context, token goes to attacker.
- **Fix:** Allowlist production origins for redirect URLs.

#### M6. Missing Audit Logging for Admin Operations
- **Files:** Admin pages
- **Issue:** Admin operations lack audit trail. Edge Functions log properly but admin UI actions do not.

#### M7. No Rate Limit on Profile Updates
- **File:** `apps/member/src/stores/useAuthStore.ts` — lines 334-351
- **Issue:** Profile updates have no rate limiting. Could be used for storage abuse via avatar URL spam.

#### M8. Silent Username Check Rate Limit Degradation
- **File:** `apps/member/src/stores/useAuthStore.ts` — lines 489-501
- **Issue:** Returns false (unavailable) when rate-limited, confusing users.

#### M9. Password Minimum at 8 Characters
- **File:** `apps/member/src/pages/auth/SignIn.tsx` — lines 28-31
- **Issue:** Meets NIST minimum but modern guidance recommends 12+.

#### M10. Large Agent Definitions (AgentShield)
- **Files:** 4 agent definition files over 5000 chars
- **Verdict:** Content reviewed and verified as legitimate.

---

## Immediate Action Items (Pre-Deadline)

| Priority | Item | Owner | Est. Effort |
|----------|------|-------|-------------|
| **P0** | Change rate-limit fail-open to fail-closed | Backend | 30 min |
| **P0** | Fix QR scanner lock release (try/finally) | Frontend | 15 min |
| **P0** | Add token format validation in QRScanner | Frontend | 15 min |
| **P1** | Add chapter-lock check in generate-qr-token | Edge Fn | 30 min |
| **P1** | Add server-side chapter-lock RLS for registrations | DB | 30 min |
| **P1** | Normalize error messages in award-points-on-scan | Edge Fn | 15 min |
| **P2** | Remove localhost from CORS in production | Edge Fn | 15 min |
| **P2** | Add PreToolUse hooks to settings.json | Config | 15 min |
| **P2** | Add Zod validation for URL params | Frontend | 30 min |

---

## What's Already Secure (Validated)

- .env.local is NOT tracked in git (.gitignore covers *.env.local)
- RLS enabled on all critical tables (profiles, events, registrations, points)
- Edge Functions use HMAC-SHA256 token validation
- Atomic checked_in: false -> true prevents double-award
- CSP headers enforced (promoted from Report-Only)
- Deny list in settings.json blocks destructive operations
- Rate limiting exists on login, signup, QR generate, QR scan, org upgrade
- No unsafe HTML rendering found in codebase
- Supabase queries use parameterized client (no SQL concatenation)

---

## Recommendations for Post-MVP

1. Implement httpOnly session cookies via server middleware
2. Add CAPTCHA after rate limit triggers
3. Create audit_log table for admin actions
4. Enable Dependabot for dependency vulnerability alerts
5. Increase password minimum to 12 characters
6. Add token rotation and binding
7. Conduct penetration test before scaling beyond MVP
