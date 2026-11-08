/**
 * Adds the Coach Me 2 program content (appointment types, forms, automatic form rules,
 * documents, demo coach hours). Safe to run any number of times: existing rows are left
 * as they are, so edits made in Settings or the form builder are never overwritten.
 *
 *   npm run db:content
 */
import { PrismaClient } from "@prisma/client";
import { parseFieldSpec } from "../src/lib/forms";

const prisma = new PrismaClient();

const DRAFT = "Draft questions. Replace with the final CM2 wording in Forms → Form builder.";

const FORMS: Array<{ key: string; name: string; stage: string; audience: string; description: string; spec: string }> = [
  {
    key: "intake_form",
    name: "Intake form",
    stage: "intake",
    audience: "client",
    description: DRAFT,
    spec: `
text | What grade are you in and what school do you attend?
longtext | What made you interested in coaching?
choice | What would you most like help with? | College planning; School and grades; Stress and balance; Confidence; Figuring out what I want; Something else
longtext | What does a great week look like for you?
longtext | ?Anything else your coach should know?`,
  },
  {
    key: "pre_coaching_high_school",
    name: "Pre-coaching high school survey",
    stage: "pre",
    audience: "client",
    description: DRAFT,
    spec: `
likert5 | I know what I want to do after high school
likert5 | I have a plan for reaching my goals this year
likert5 | I can manage my schoolwork without feeling overwhelmed [wellbeing]
likert5 | I feel confident talking to adults about my plans
scale10 | How prepared do you feel for life after high school?`,
  },
  {
    key: "post_coaching_high_school",
    name: "Post-coaching high school survey",
    stage: "post",
    audience: "client",
    description: DRAFT,
    spec: `
likert5 | I know what I want to do after high school
likert5 | I have a plan for reaching my goals this year
likert5 | I can manage my schoolwork without feeling overwhelmed [wellbeing]
likert5 | I feel confident talking to adults about my plans
scale10 | How prepared do you feel for life after high school?
longtext | What is the most important thing you got out of coaching?`,
  },
  {
    key: "post_coaching_fulfillment",
    name: "Post-coaching fulfillment compass",
    stage: "post",
    audience: "client",
    description: DRAFT,
    spec: `
scale10 | School and learning [fulfillment]
scale10 | Friends and relationships [fulfillment]
scale10 | Family [fulfillment]
scale10 | Health, sleep, and energy [fulfillment]
scale10 | Fun and free time [fulfillment]
scale10 | Purpose and direction [fulfillment]`,
  },
  {
    key: "wellbeing_compass",
    name: "Well-being compass",
    stage: "session",
    audience: "client",
    description: "A one-minute check-in before each session. " + DRAFT,
    spec: `
scale10 | Overall, how are you doing this week? [wellbeing]
scale10 | How well have you been sleeping? [wellbeing]
scale10 | How stressed have you felt? (10 = very calm) [wellbeing]
text | ?One thing you want to talk about in your session`,
  },
  {
    key: "ai_scribe_consent",
    name: "Informed consent: AI note-taking",
    stage: "intake",
    audience: "client",
    description:
      "Your coach can use an AI note-taker during sessions so they can focus on you. The transcript is used only to draft your coach's notes, which your coach reviews and edits. Notes are never shared with your parents. You can change your mind at any time.",
    spec: `
choice | Is it OK for your coach to use AI note-taking in your sessions? | Yes, that's fine; No, I'd rather they take notes by hand
text | ?Any questions or concerns for your coach?`,
  },
  {
    key: "session_notes_first",
    name: "Scribe form: first session",
    stage: "scribe",
    audience: "scribe",
    description: "Sections the AI scribe fills in for a first coaching session.",
    spec: `
longtext | Who the student is (interests, context, what matters to them)
longtext | What they want from coaching
longtext | Strengths noticed
longtext | Goals discussed
longtext | Agreed next steps
longtext | Include quotes`,
  },
  {
    key: "session_notes_follow_up",
    name: "Scribe form: follow-up session",
    stage: "scribe",
    audience: "scribe",
    description: "Sections the AI scribe fills in for a regular session.",
    spec: `
longtext | Progress since last session
longtext | Main topics
longtext | Wins and challenges
longtext | Action items for the student
longtext | Include quotes`,
  },
  {
    key: "session_notes_final",
    name: "Scribe form: final session",
    stage: "scribe",
    audience: "scribe",
    description: "Sections the AI scribe fills in for the last session.",
    spec: `
longtext | Growth over the program
longtext | Goals reached and goals still open
longtext | Plan going forward
longtext | Include quotes`,
  },
];

const TYPES = [
  {
    id: "type-first",
    name: "First coaching session",
    durationMinutes: 60,
    kind: "first",
    clientCanBook: false,
    scribeFormKey: "session_notes_first",
    aiScribeInstructions:
      "This is the student's first session. Capture who they are, what they hope to get from coaching, and the goals you agreed on. Keep the student's own words where they reveal motivation.",
  },
  {
    id: "type-coaching-45",
    name: "Follow-up session",
    durationMinutes: 45,
    kind: "follow_up",
    clientCanBook: true,
    scribeFormKey: "session_notes_follow_up",
    aiScribeInstructions:
      "Summarize progress since last time, the main topics, and concrete action items the student committed to.",
  },
  {
    id: "type-final",
    name: "Final coaching session",
    durationMinutes: 60,
    kind: "final",
    clientCanBook: false,
    scribeFormKey: "session_notes_final",
    aiScribeInstructions:
      "This is the last session. Capture growth over the program, which goals were reached, and the student's plan going forward.",
  },
];

const RULES = [
  { templateKey: "intake_form", appointmentKind: "first", anchor: "after_booking", offsetMinutes: 0, firstOnly: true },
  { templateKey: "pre_coaching_fulfillment", appointmentKind: "first", anchor: "after_booking", offsetMinutes: 0, firstOnly: true },
  { templateKey: "pre_coaching_high_school", appointmentKind: "first", anchor: "after_booking", offsetMinutes: 0, firstOnly: true },
  { templateKey: "ai_scribe_consent", appointmentKind: "first", anchor: "before_appointment", offsetMinutes: 120, firstOnly: true },
  { templateKey: "wellbeing_compass", appointmentKind: "any", anchor: "before_appointment", offsetMinutes: 1440, firstOnly: false },
  { templateKey: "post_coaching_fulfillment", appointmentKind: "final", anchor: "after_appointment", offsetMinutes: 0, firstOnly: false },
  { templateKey: "post_coaching_high_school", appointmentKind: "final", anchor: "after_appointment", offsetMinutes: 0, firstOnly: false },
  { templateKey: "post_coaching_impact", appointmentKind: "final", anchor: "after_appointment", offsetMinutes: 0, firstOnly: false },
];

const DOCUMENTS = [
  {
    key: "coaching_agreement",
    title: "Coaching agreement and confidentiality",
    signers: "client,guardian",
    body: `Coach Me 2 coaching is a partnership between the student and their coach.

What students share in coaching stays between the student and the coach (and the program manager, who supervises coaching quality). Parents and guardians receive short progress updates: what the student is working on, a progress rating, and the goals by name. Details of conversations are not shared.

Confidentiality has one exception: if a coach believes the student or someone else is at risk of serious harm, the coach will contact the parent or guardian and, if needed, emergency services.

Sessions are held by video. Please give at least 24 hours' notice to cancel so the session credit can be returned.

[Draft. Replace with the final agreement in Documents.]`,
  },
  {
    key: "ai_scribe_consent",
    title: "Informed consent for AI note-taking",
    signers: "client",
    body: `Your coach may use an AI note-taker during sessions. It drafts notes from the session transcript using a form your coach chose for that kind of session. Your coach reads and edits every note.

Notes are visible to your coach and the program manager only. Parents never see them.

You can say no now or turn it off later from your workspace, and your coach will take notes by hand instead.

[Draft. Replace with the final consent wording in Documents.]`,
  },
  {
    key: "parent_consent",
    title: "Parent or guardian consent",
    signers: "guardian",
    body: `I give permission for my child to take part in Coach Me 2 coaching by video, and I understand the confidentiality terms in the coaching agreement.

I am listed as the emergency contact and may be contacted if there is a safety concern.

[Draft. Replace with the final consent wording in Documents.]`,
  },
];

async function main() {
  const existingPre = await prisma.formTemplate.findUnique({ where: { key: "pre_coaching_fulfillment" } });
  if (existingPre?.name === "Pre-coaching fulfillment campus") {
    await prisma.formTemplate.update({ where: { key: "pre_coaching_fulfillment" }, data: { name: "Pre-coaching fulfillment compass" } });
  }

  for (const f of FORMS) {
    const { fields, errors } = parseFieldSpec(f.spec);
    if (errors.length) throw new Error(`${f.key}: ${errors.join("; ")}`);
    await prisma.formTemplate.upsert({
      where: { key: f.key },
      update: {},
      create: {
        key: f.key,
        name: f.name,
        stage: f.stage,
        audience: f.audience,
        description: f.description,
        schemaJson: JSON.stringify(fields),
      },
    });
  }

  for (const t of TYPES) {
    const existing = await prisma.appointmentType.findUnique({ where: { id: t.id } });
    if (existing) {
      await prisma.appointmentType.update({
        where: { id: t.id },
        data: {
          kind: t.kind,
          scribeFormKey: existing.scribeFormKey ?? t.scribeFormKey,
          aiScribeInstructions: existing.aiScribeInstructions || t.aiScribeInstructions,
          ...(existing.name === "Coaching session (45 min)" ? { name: t.name } : {}),
        },
      });
    } else {
      await prisma.appointmentType.create({ data: t });
    }
  }

  for (const r of RULES) {
    const exists = await prisma.formReleaseRule.findFirst({
      where: { templateKey: r.templateKey, anchor: r.anchor, appointmentKind: r.appointmentKind },
    });
    if (!exists) await prisma.formReleaseRule.create({ data: r });
  }

  for (const d of DOCUMENTS) {
    await prisma.documentTemplate.upsert({ where: { key: d.key }, update: {}, create: d });
  }

  const demoCoach = await prisma.coachRoster.findUnique({ where: { coachId: "demo-coach" }, include: { availability: true } });
  if (demoCoach && demoCoach.availability.length === 0) {
    const slots = [1, 2, 3, 4].map((weekday) => ({ coachId: "demo-coach", weekday, startMinute: 15 * 60 + 30, endMinute: 19 * 60 }));
    slots.push({ coachId: "demo-coach", weekday: 6, startMinute: 10 * 60, endMinute: 13 * 60 });
    await prisma.coachAvailability.createMany({ data: slots });
    if (!demoCoach.focusAreas) {
      await prisma.coachRoster.update({
        where: { coachId: "demo-coach" },
        data: { focusAreas: "college planning, academics, stress and balance, confidence" },
      });
    }
  }

  if ((await prisma.programUpdate.count()) === 0) {
    await prisma.programUpdate.createMany({
      data: [
        {
          kind: "podcast",
          title: "Episode 1: What teens wish adults knew",
          summary: "Coach Me 2 students talk about pressure, purpose, and what actually helps. (Sample entry: edit in Website updates.)",
          url: "",
        },
        {
          kind: "research",
          title: "Early results: fulfillment compass, pre vs. post",
          summary: "A first look at how students' sense of fulfillment changes over a coaching program. (Sample entry.)",
          url: "",
        },
      ],
    });
  }

  if ((await prisma.coachRequest.count()) === 0) {
    await prisma.coachRequest.create({
      data: {
        studentName: "Jordan Lee",
        studentEmail: "jordan.sample@example.com",
        parentName: "Pat Lee",
        parentEmail: "pat.sample@example.com",
        grade: "10",
        interests: "college planning, stress and balance",
        preferredTimes: "weekday_after_school",
        notes: "Sample request from the website form.",
      },
    });
  }

  const PACKETS: Array<{
    key: string;
    audience: string;
    kind: "signature" | "form";
    title: string;
    description: string;
    body?: string;
    spec?: string;
    sortOrder: number;
  }> = [
    {
      key: "coach_agreement",
      audience: "coach",
      kind: "signature",
      sortOrder: 1,
      title: "Coach agreement",
      description: "How coaching works, and what stays confidential.",
      body: `Coach Me 2 coaching is a partnership with the student. What a student shares stays between the student, their coach, and the program manager who supervises quality.

Parents receive short progress updates only: focus, a rating, and goal names. Conversation details are not shared, except when someone may be at serious risk of harm. In that case the coach contacts the parent and, if needed, emergency services.

Coaches use only the students assigned to them, keep notes in this workspace, and do not move student information into personal accounts.

[Draft. Replace with the final agreement under Interns and coach forms.]`,
    },
    {
      key: "coach_safeguarding",
      audience: "coach",
      kind: "signature",
      sortOrder: 2,
      title: "Safeguarding acknowledgement",
      description: "What you do if a student may be unsafe.",
      body: `I will follow Coach Me 2 safeguarding practice.

If I believe a student or someone else may be at risk of serious harm, I will not wait. I will contact the parent or guardian and tell my program manager. If a child may be abused, I will call 1-855-GA-CHILD, then tell my program lead.

I will not promise a student that I can keep a safety concern secret.

[Draft. Replace with the final acknowledgement under Interns and coach forms.]`,
    },
    {
      key: "coach_profile",
      audience: "coach",
      kind: "form",
      sortOrder: 3,
      title: "How you coach",
      description: "So managers can match you, and so your workspace matches your load.",
      spec: `
choice | Which areas do you coach? | College planning; Academics; Stress and balance; Confidence; Leadership; Career exploration
longtext | In a few sentences, how do you like to coach?
choice | How many students can you take right now? | 2; 4; 6; 8
text | City you will coach from`,
    },
    {
      key: "intern_agreement",
      audience: "intern",
      kind: "signature",
      sortOrder: 1,
      title: "Intern agreement",
      description: "What the intern role is, and what it is not.",
      body: `Teen interns help Coach Me 2 teams communicate and share program documents. Interns are not coaches. They do not see student coaching notes, journals, or session details.

Be respectful in team chat. Do not share another person's private information outside the workspace. If something in the program worries you, tell a manager.

[Draft. Replace with the final intern agreement under Interns and coach forms.]`,
    },
    {
      key: "intern_conduct",
      audience: "intern",
      kind: "signature",
      sortOrder: 2,
      title: "Team conduct",
      description: "How interns talk with their team and with other teams.",
      body: `I will use team chat and shared documents for program work.

I will keep my team's private channel inside the team. Messages in "Between teams" and "All interns" can be read by every intern and by managers.

I will not post anything cruel, private, or unrelated to the program.

[Draft. Replace with the final conduct wording under Interns and coach forms.]`,
    },
    {
      key: "intern_parent_permission",
      audience: "intern_parent",
      kind: "signature",
      sortOrder: 1,
      title: "Parent permission for a teen intern",
      description: "Permission for your teen to join an intern team.",
      body: `I give permission for my child to take part in the Coach Me 2 teen intern program.

Interns work with their team and with other intern teams inside this workspace. They do not see other students' coaching conversations. Managers can read intern chat and shared documents.

I am the parent or guardian who should be contacted about this intern role.

[Draft. Replace with the final permission wording under Interns and coach forms.]`,
    },
    {
      key: "intern_parent_communication",
      audience: "intern_parent",
      kind: "signature",
      sortOrder: 2,
      title: "Permission to use team chat and documents",
      description: "Your teen can message their team and share program documents after this is signed.",
      body: `I understand my child will use team chat and shared documents with other teen interns and with program managers.

The intern workspace opens only after my child and I have both signed. I can see whether those forms are done. I do not see the team chat itself.

[Draft. Replace with the final wording under Interns and coach forms.]`,
    },
  ];

  for (const packet of PACKETS) {
    const schemaJson =
      packet.kind === "form"
        ? JSON.stringify(parseFieldSpec(packet.spec ?? "").fields)
        : "[]";
    if (packet.kind === "form") {
      const parsed = parseFieldSpec(packet.spec ?? "");
      if (parsed.errors.length) throw new Error(`${packet.key}: ${parsed.errors.join("; ")}`);
    }
    await prisma.accessPacket.upsert({
      where: { key: packet.key },
      update: {},
      create: {
        key: packet.key,
        audience: packet.audience,
        kind: packet.kind,
        title: packet.title,
        description: packet.description,
        body: packet.body ?? "",
        schemaJson,
        sortOrder: packet.sortOrder,
      },
    });
  }

  async function completeDemo(packetKey: string, subjectKey: string, signerRole: string, signerName: string, email: string, answers: Record<string, string> = {}) {
    const packet = await prisma.accessPacket.findUnique({ where: { key: packetKey } });
    const signer = await prisma.user.findUnique({ where: { email } });
    if (!packet || !signer) return;
    await prisma.accessCompletion.upsert({
      where: { packetId_subjectKey_signerRole: { packetId: packet.id, subjectKey, signerRole } },
      update: {},
      create: {
        packetId: packet.id,
        subjectKey,
        signerRole,
        signerName,
        signerUserId: signer.id,
        answersJson: JSON.stringify(answers),
        version: packet.version,
      },
    });
  }

  const coachProfile = parseFieldSpec(PACKETS.find((p) => p.key === "coach_profile")?.spec ?? "").fields;
  const profileAnswers = Object.fromEntries(
    coachProfile.map((field) => {
      if (field.id.includes("area")) return [field.id, "Stress and balance"];
      if (field.id.includes("student")) return [field.id, "8"];
      if (field.type === "longtext") return [field.id, "I coach by listening first, then agreeing on one next step."];
      return [field.id, "Atlanta"];
    }),
  );
  for (const key of ["coach_agreement", "coach_safeguarding"]) {
    await completeDemo(key, "demo-coach", "coach", "Jordan Blake", "coach@example.com");
  }
  await completeDemo("coach_profile", "demo-coach", "coach", "Jordan Blake", "coach@example.com", profileAnswers);
  for (const key of ["intern_agreement", "intern_conduct"]) {
    await completeDemo(key, "intern-maya", "intern", "Maya Chen", "maya.chen@example.com");
    await completeDemo(key, "intern-leo", "intern", "Leo Park", "leo.park@example.com");
  }
  for (const key of ["intern_parent_permission", "intern_parent_communication"]) {
    await completeDemo(key, "intern-maya", "intern_parent", "Priya Chen", "priya.chen@example.com");
  }

  console.log("CM2 content is in place.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
