# Coach Me 2: CoachMe2.world + client management

One app for the public CoachMe2.world website and the Coach Me 2 back office (coaches, managers,
students, parents, interns). The website pages live in `src/app/(site)` and read their text,
people, and links from `src/content/site.ts`. Coaches are accepted only after a signed status
event from the onboarding app.

- Local URL: http://localhost:3000
- Coach onboarding: http://localhost:3001

```bash
cp .env.example .env
npm install
npx prisma db push
npm run db:seed      # demo users + CM2 program content
npm run dev
```

`npm run site:assets` copies the website's photos and illustrations from the old
coachme2-world.vercel.app site into `public/site` (run it once on a computer with internet access,
then commit the files). Until then, pages load those images from the old site.

`npm run db:content` adds the CM2 program content (appointment types, forms, automatic form
rules, documents) to an existing database without touching anything already there.

Optional environment variables:

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | AI scribe drafts notes with Claude. Without it, a local keyword-based drafter is used. |
| `ANTHROPIC_MODEL` | Claude model (default `claude-sonnet-4-5`) |
| `ONBOARDING_APP_URL` | "Become a coach" link on the public home page |
| `COACH_STATUS_SECRET` | Shared secret for signed coach status events from onboarding |
| `DEMO_LOGINS` | Set to `on` to pre-fill the manager login and list demo accounts on /login. Leave unset on the live site. |
| `SITE_ASSET_ORIGIN` | Where website images load from until `npm run site:assets` has copied them |

## Deploying

Vercel's build runs `prisma db push` first, so new tables and columns reach the database without
running anything by hand. It refuses changes that would delete data, so a risky schema change stops
the build instead of losing anything.

## Demo accounts

Password for all demos: `demo1234`

| Role | Email |
| --- | --- |
| Manager | `lead@coachme2.org` |
| Admin | `admin@coachme2.org` |
| Coach (forms done) | `coach@example.com` |
| Coach (forms still open) | `pending.coach@example.com` |
| Parent | `guardian@example.com` |
| Student | `teen@example.com` |
| Intern (cleared) | `maya.chen@example.com` |
| Intern (waiting on parent) | `leo.park@example.com` |
| Intern parent (signed) | `priya.chen@example.com` |
| Intern parent (still signing) | `sam.park@example.com` |

## Who can do what

- **Managers:** see every coach's calendar, availability, notes, appointments, and credits. Match
  students to coaches (three suggestions each), enroll students, and run Settings: access control,
  appointment types, automatic forms, confirmation email, documents, and website updates.
- **Coaches:** see only their own students. Calendar, chat, video, quick notes, tasks, AI scribe
  notes, forms, metrics, and parent progress updates. They can't see other coaches' notes.
- **Students:** chat with their coach, book sessions (if allowed), journal, goals with daily
  reminders, forms, values inventory, portfolio, and documents to sign.
- **Parents:** restricted. Upcoming sessions, credits, documents to sign, short progress updates
  (focus areas, rating, goal names), and a message form to the coach. Coaching conversations
  stay confidential except in an emergency.
- **Coaches, before forms:** an activated coach still has to sign the coach agreement, safeguarding
  acknowledgement, and coaching profile. Until then the student list, chat, and calendar stay closed.
- **Interns:** after the intern and a parent both sign, the intern gets a separate workspace: their
  team, chat with their team, all interns, and between teams, plus shared documents. Parents sign
  and can see that status. They do not see team chat. Coaching notes are not in the intern workspace.

## Private clients (coach caseloads)

Coaches can add their own clients from Clients → Add my own client. Those clients are private to
that coach: managers, other coaches, matching, credits, metrics exports, and program counts never
include them, and the team calendar shows only "Busy · outside CM2". A switcher in the coach's
sidebar flips between Coach Me 2 clients, their own clients, or everyone. Private clients get
`PVT-` IDs; program clients keep `CM2-` IDs.

## Phone & Apple Watch

- **Installable app:** on iPhone, Safari → Share → Add to Home Screen opens the portal full-screen with the
  Coach Me 2 icon (`src/app/manifest.ts`, `public/sw.js`).
- **Notifications:** people turn them on under Phone & Apple Watch (`/account/devices`). New chat messages,
  intern messages, bookings, and a daily morning reminder (Vercel Cron, `/api/cron/daily`) are sent with Web Push.
  iPhone notifications appear on a paired Apple Watch. Notifications never include message text. Keys are created
  automatically; set `CRON_SECRET` on Vercel to lock the reminder job to Vercel's scheduler.
- **Calendar feed:** each person gets a private link that puts their sessions in Apple Calendar (and on Apple
  Watch), Google Calendar, or Outlook with a 15-minute alert.

## Feature map

| Area | Route |
| --- | --- |
| Public website (home, about, teens, parents, partners, programs, coaches, board, interns, resources, podcast, research, donate, contact, get involved) | `/`, `/about`, `/teens`, … (see `src/app/(site)`) |
| Get a coach (discovery call, request form, sign in) | `/scheduling`, `/get-a-coach` |
| Coach Me 2 hub: everything in one place | `/hub` |
| Website inbox: contact form, intern applications, quiz sign-ups | `/inbox` |
| Coach's own private clients | `/clients/private/new`, sidebar caseload switcher |
| Public JSON feed for the website (links, podcast, research) | `/api/public/updates` |
| Home (role dashboards with to-dos) | `/workspace` |
| Coach matching (top 3 suggestions) | `/matching` |
| Client profile | `/clients/[id]` |
| Calendar: team week, upcoming, past, no-show, repeating bookings | `/calendar` |
| Appointment notes and AI scribe | `/calendar/[id]` |
| Coach weekly hours and focus areas | `/availability` |
| Forms, form builder, CSV export by client ID | `/forms`, `/forms/builder` |
| Metrics: trends and pre/mid/post question averages | `/metrics` |
| Values inventory and world view map | `/values` |
| Achievement portfolio | `/portfolio` |
| Documents and signatures | `/documents` |
| Settings | `/settings` |
| Coach forms (required before students) | `/onboarding` |
| Intern workspace, forms, chat, documents | `/intern`, `/intern/start`, `/intern/chat`, `/intern/documents` |
| Manager: interns, teams, coach form status | `/interns` |

## Program rules

- **Credits:** booking spends one credit. The refund policy is set in Settings: refund when
  cancelled at least N hours ahead (24 by default), always refund, or never refund. Coaches can
  restore a credit by hand.
- **Automatic forms (Settings → Automatic forms):** after a first session is booked, the intake
  form and the pre-coaching fulfillment and high school surveys are released right away. AI
  consent goes out 2 hours before the first session. The well-being compass goes out 1 day
  before every session. Post-coaching forms go out after the final session.
- **AI scribe:** every appointment type has its own note form, and the scribe fills in that
  form's sections. A section named with "quote" collects the student's own words. Coaches edit
  before saving. A student who declines AI consent, or turns it off, gets hand-written notes
  only. Managers can turn the scribe off for the whole program.

All form questions are drafts until the final CM2 wording is entered in the form builder.

## Not yet connected to real vendors

Google/Outlook/Apple calendar sync, real Zoom meeting creation, outbound email (messages are
recorded in the `EmailLog` table), live transcription (transcripts are pasted in), and billing.

`bash scripts/smoke.sh` signs in as every demo role and loads every page.
