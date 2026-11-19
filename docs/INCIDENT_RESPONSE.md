# Coach Me 2 — Incident Response Plan (draft for approval)

**Owner:** Rebecca Oertell (Program Director) · **Technical lead:** Arshia Bajaj · **Review:** every 6 months and after any incident.

An *incident* is anything that could expose, change, or lose personal information in the client portal: a lost
or stolen device that was signed in, a password shared or phished, someone seeing data they shouldn't, a
suspicious sign-in, a vendor breach notice (Vercel, Neon, Google), or data deleted by mistake.

## First hour
1. **Tell the technical lead and the director** right away (text or call). Don't investigate alone.
2. **Contain it:**
   - Lost device or leaked password → Settings → Sign-in help → *Create temporary password* for that person (this also signs them out everywhere).
   - Suspected admin account compromise → change that person's Google/portal password, turn two-step sign-in back on, and rotate `AUTH_SECRET` in Vercel (signs out everyone).
   - Leaked secret (database URL, email app password, webhook) → rotate it in Vercel/Neon/Google and redeploy.
3. **Write down** what happened, when, who noticed, and what you did (time-stamped).

## First day
4. **Look at the audit log** (sign-ins, failed sign-ins, chat views, exports, account changes) to see what was accessed.
5. **Decide who must be told.** If a teen's or parent's personal information was likely seen by someone who shouldn't have it, tell the family plainly within 72 hours: what happened, what information, what we did, who to contact. Check with a lawyer about any legal notice duties (some states require notice).
6. **If a child may be at risk**, follow the safeguarding steps below — this always comes first.

## Safeguarding (child safety)
- Any sign of abuse or neglect: coaches and volunteers are mandated reporters in Georgia and must report to **DFCS within 24 hours** (1-855-GACHILD / 1-855-422-4453). If someone is in immediate danger, call **911**.
- Concerns raised through *Report a concern* are reviewed by a program manager the same day (Safety concerns page).

## Afterwards
7. Fix the cause, update this plan if needed, and note the lessons learned.

## Contacts
- Director: Rebecca Oertell · Technical lead: Arshia Bajaj
- Vercel support / Neon support (from their dashboards) · Google account recovery
