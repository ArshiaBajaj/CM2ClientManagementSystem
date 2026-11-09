# Security, privacy, and accessibility

Last review: November 2026.

## Fixed in this review

| Risk | Was | Now |
| --- | --- | --- |
| Session forgery | Code fell back to a public secret if `AUTH_SECRET` was missing | Refuses to run in production without a 32+ character `AUTH_SECRET` |
| Fake coach activations | Fell back to a public `COACH_STATUS_SECRET` | Endpoint is off unless the secret is set |
| Shared passwords | Every demo and new account used `demo1234` | Demo accounts only work when `DEMO_LOGINS=on`; new accounts get a unique temporary password shown once; Settings → Sign-in help issues new ones |
| Password guessing | Unlimited attempts | 5 wrong passwords per email locks it for 15 minutes |
| Next.js advisories | 15.5.3 (critical: image optimizer RCE, cache poisoning) | 15.5.29; PostCSS pinned to a patched version |
| Missing browser protections | No security headers | CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy; signed-in pages are `no-store` |
| Unattended sessions | 12-hour sessions | 8-hour sessions plus sign-out after 30 minutes idle (with a warning) |
| Access trail | Partial | Sign-ins, failed sign-ins, client record views, temporary passwords, and World View consent are logged in `AuditEvent` |
| Coaches' private clients | n/a | Managers can't open or message them, even with a direct link |
| Accessibility | Low-contrast text, no visible focus | WCAG 2.1 AA checks (axe) pass on all public pages and the main portal pages; skip link, focus outlines, 44px tap targets, reduced motion, labeled controls |

Still open: `prisma` 6 pulls in `deepmerge-ts` (build-time only, not in the running site). Fixed by upgrading to Prisma 7 later.

## HIPAA: what code can and can't do

The app now has the technical safeguards HIPAA expects (access control, audit logs, automatic logoff, encryption in transit, unique logins). Being HIPAA compliant also needs things only Coach Me 2 can do:

1. **Decide whether HIPAA applies.** Coaching (not therapy) by a nonprofit is often not a HIPAA "covered entity." Ask counsel; FERPA, COPPA (under-13s are excluded by age), and state privacy laws may matter more.
2. **Sign Business Associate Agreements** with every service that stores or sees client data: Vercel (BAAs are offered to Pro teams), Neon (has a HIPAA program; confirm the plan), and Anthropic if the AI scribe is used with real sessions. Don't put real client data in until these are signed.
3. **Policies and training:** a risk assessment, breach-notification plan, workforce training, and a named privacy officer.
4. **Encryption at rest and backups:** confirm with Neon (it encrypts storage by default) and turn on point-in-time recovery.

## Before real families use the portal

- Remove `DEMO_LOGINS` from Production in Vercel (and delete the seeded demo users from the production database).
- Set `CRON_SECRET` in Vercel so only Vercel's scheduler can run the daily reminders.
- Have counsel review `/privacy`.
