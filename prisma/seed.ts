import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const password = hashPassword("demo1234");

  await prisma.programSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      creditsEnabled: true,
      cancelRefundHours: 24,
      coachCanRestoreCredits: true,
      notesTakenNotice: true,
      confirmationEmailSubject: "Your Coach Me 2 appointment is confirmed",
      confirmationEmailBody:
        "Hi {{clientName}}, your coaching session with {{coachName}} is confirmed for {{startsAt}}. A Zoom (HIPAA) link will appear in your workspace.",
    },
  });

  await prisma.appointmentType.upsert({
    where: { id: "type-coaching-45" },
    update: {},
    create: {
      id: "type-coaching-45",
      name: "Coaching session (45 min)",
      durationMinutes: 45,
      meetingProvider: "zoom_hipaa",
      aiScribeInstructions:
        "Summarize session goals, student mood, key wins, challenges, and agreed next steps. Flag any safety concerns for the manager. Keep language coach-facing and confidential from parents.",
      confirmationEmailBody:
        "Hi {{clientName}}, your 45-minute coaching session with {{coachName}} is booked for {{startsAt}}.",
      active: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "lead@coachme2.org" },
    update: {},
    create: {
      email: "lead@coachme2.org",
      name: "Morgan Ellis",
      password,
      role: "team_lead",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@coachme2.org" },
    update: {},
    create: {
      email: "admin@coachme2.org",
      name: "CM2 Admin",
      password,
      role: "admin",
    },
  });

  const household = await prisma.household.upsert({
    where: { id: "demo-household" },
    update: {},
    create: {
      id: "demo-household",
      name: "Rivera household",
    },
  });

  await prisma.guardian.upsert({
    where: { id: "demo-guardian" },
    update: {
      phone: "555-0100",
      isEmergencyContact: true,
    },
    create: {
      id: "demo-guardian",
      householdId: household.id,
      name: "Alex Rivera",
      email: "guardian@example.com",
      relationship: "parent",
      phone: "555-0100",
      isEmergencyContact: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "guardian@example.com" },
    update: {},
    create: {
      email: "guardian@example.com",
      name: "Alex Rivera",
      password,
      role: "guardian",
    },
  });

  const client = await prisma.client.upsert({
    where: { id: "demo-client" },
    update: {
      publicId: "CM2-10001",
      email: "teen@example.com",
      phone: "555-0101",
      emergencyContactName: "Alex Rivera",
      emergencyContactPhone: "555-0100",
      emergencyContactEmail: "guardian@example.com",
      emergencyContactRelation: "parent",
    },
    create: {
      id: "demo-client",
      publicId: "CM2-10001",
      householdId: household.id,
      firstName: "Sam",
      lastName: "Rivera",
      dateOfBirth: "2010-04-12",
      status: "enrolled",
      email: "teen@example.com",
      phone: "555-0101",
      emergencyContactName: "Alex Rivera",
      emergencyContactPhone: "555-0100",
      emergencyContactEmail: "guardian@example.com",
      emergencyContactRelation: "parent",
    },
  });

  await prisma.user.upsert({
    where: { email: "teen@example.com" },
    update: {},
    create: {
      email: "teen@example.com",
      name: "Sam Rivera",
      password,
      role: "client",
      clientId: client.id,
    },
  });

  const wallet = await prisma.creditWallet.upsert({
    where: { householdId: household.id },
    update: { balance: 6 },
    create: { householdId: household.id, balance: 6 },
  });

  const existingPurchase = await prisma.creditLedger.findFirst({
    where: { walletId: wallet.id, reason: "pack_purchase_6" },
  });
  if (!existingPurchase) {
    await prisma.creditLedger.create({
      data: {
        walletId: wallet.id,
        delta: 6,
        reason: "pack_purchase_6",
        actorId: "seed",
      },
    });
  }

  await prisma.consent.upsert({
    where: { id: "demo-consent" },
    update: {},
    create: {
      id: "demo-consent",
      clientId: client.id,
      kind: "guardian_program_consent",
      version: "2026.09",
      grantedBy: "Alex Rivera",
    },
  });

  await prisma.goal.upsert({
    where: { id: "demo-goal" },
    update: {
      remindAtHour: 20,
      interactive: true,
    },
    create: {
      id: "demo-goal",
      clientId: client.id,
      title: "Prep for SAT every weekday",
      cadence: "weekdays",
      status: "active",
      remindAtHour: 20,
      interactive: true,
    },
  });

  const coach = await prisma.coachRoster.upsert({
    where: { coachId: "demo-coach" },
    update: {
      email: "coach@example.com",
      name: "Jordan Blake",
      status: "active",
      programRoles: JSON.stringify(["teen_coaching"]),
      effectiveAt: new Date("2026-01-15"),
      expiresAt: null,
      sourceEventId: "seed-coach-activated",
    },
    create: {
      coachId: "demo-coach",
      email: "coach@example.com",
      name: "Jordan Blake",
      status: "active",
      programRoles: JSON.stringify(["teen_coaching"]),
      effectiveAt: new Date("2026-01-15"),
      expiresAt: null,
      sourceEventId: "seed-coach-activated",
    },
  });

  await prisma.user.upsert({
    where: { email: "coach@example.com" },
    update: { coachId: coach.coachId, role: "coach" },
    create: {
      email: "coach@example.com",
      name: "Jordan Blake",
      password,
      role: "coach",
      coachId: coach.coachId,
    },
  });

  const assignment = await prisma.assignment.upsert({
    where: { id: "demo-assignment" },
    update: { status: "active" },
    create: {
      id: "demo-assignment",
      coachId: coach.coachId,
      clientId: client.id,
      status: "active",
    },
  });

  await prisma.sessionAllowance.upsert({
    where: { assignmentId: assignment.id },
    update: { allowed: 12, used: 2, remaining: 10 },
    create: {
      assignmentId: assignment.id,
      allowed: 12,
      used: 2,
      remaining: 10,
    },
  });

  const existingSession = await prisma.sessionLog.findFirst({
    where: { assignmentId: assignment.id },
  });
  if (!existingSession) {
    await prisma.sessionLog.create({
      data: {
        assignmentId: assignment.id,
        occurredAt: new Date("2026-09-20"),
        minutes: 45,
        summary: "Checked in on sleep routine and school-week stress.",
        createdById: "seed",
      },
    });
  }

  const existingNote = await prisma.note.findFirst({
    where: { clientId: client.id },
  });
  if (!existingNote) {
    await prisma.note.create({
      data: {
        clientId: client.id,
        authorId: "seed",
        authorName: "Jordan Blake",
        body: "Family prefers evening sessions after 6pm on weekdays.",
        visibility: "parent_safe",
      },
    });
    await prisma.note.create({
      data: {
        clientId: client.id,
        authorId: "seed",
        authorName: "Jordan Blake",
        body: "Confidential: student asked not to share anxiety details with parent.",
        visibility: "coach_only",
      },
    });
  }

  await prisma.conversation.upsert({
    where: { clientId_coachId: { clientId: client.id, coachId: coach.coachId } },
    update: { status: "active", lastMessageAt: new Date() },
    create: {
      clientId: client.id,
      coachId: coach.coachId,
      status: "active",
      lastMessageAt: new Date(),
    },
  });

  const convo = await prisma.conversation.findUniqueOrThrow({
    where: { clientId_coachId: { clientId: client.id, coachId: coach.coachId } },
  });

  const msgCount = await prisma.message.count({ where: { conversationId: convo.id } });
  if (msgCount === 0) {
    await prisma.message.createMany({
      data: [
        {
          conversationId: convo.id,
          senderId: "seed-coach",
          senderName: "Jordan Blake",
          senderRole: "coach",
          body: "Just checking in to see how things are going this week.",
          createdAt: new Date("2026-10-07T18:00:00"),
        },
        {
          conversationId: convo.id,
          senderId: client.id,
          senderName: "Sam Rivera",
          senderRole: "client",
          body: "all good here :)",
          createdAt: new Date("2026-10-14T16:30:00"),
        },
      ],
    });
  }

  const apptCount = await prisma.appointment.count({ where: { clientId: client.id } });
  if (apptCount === 0) {
    await prisma.appointment.create({
      data: {
        clientId: client.id,
        coachId: coach.coachId,
        appointmentTypeId: "type-coaching-45",
        startsAt: new Date("2026-09-20T17:00:00"),
        endsAt: new Date("2026-09-20T17:45:00"),
        status: "completed",
        meetingUrl: "https://zoom.us/j/demo-past",
        creditConsumed: true,
        createdById: "seed",
        aiNote: {
          create: {
            instructions:
              "Summarize session goals, student mood, key wins, challenges, and agreed next steps.",
            transcript: "Coach and student discussed sleep routine and weekday stress.",
            generatedNotes:
              "Mood: steady. Wins: consistent bedtime 3/5 nights. Challenges: weekend screen time. Next: lights-out plan by Thu.",
            editedNotes:
              "Mood: steady. Wins: consistent bedtime 3/5 nights. Challenges: weekend screen time. Next: lights-out plan by Thu.",
            status: "edited",
          },
        },
      },
    });

    await prisma.appointment.create({
      data: {
        clientId: client.id,
        coachId: coach.coachId,
        appointmentTypeId: "type-coaching-45",
        startsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
        status: "scheduled",
        meetingUrl: "https://zoom.us/j/demo-upcoming",
        creditConsumed: true,
        createdById: "seed",
      },
    });
  }

  const journalCount = await prisma.journalEntry.count({ where: { clientId: client.id } });
  if (journalCount === 0) {
    await prisma.journalEntry.create({
      data: {
        clientId: client.id,
        authorId: client.id,
        authorName: "Sam Rivera",
        authorRole: "client",
        title: "Week check-in",
        body: "SAT practice felt hard on Monday but better after breaking it into 20-minute blocks.",
        visibility: "shared",
        aiAssessment:
          "Training signal: student responds well to short practice blocks. Encourage consistency over duration.",
      },
    });
    await prisma.journalEntry.create({
      data: {
        clientId: client.id,
        authorId: "seed-coach",
        authorName: "Jordan Blake",
        authorRole: "coach",
        title: "Resource: calm-down toolkit",
        body: "Try the 4-7-8 breathing exercise before evening study.",
        visibility: "shared",
        resourceUrl: "https://coachme2.org/resources/calm-down",
      },
    });
  }

  const formTemplates = [
    {
      key: "pre_coaching_fulfillment",
      name: "Pre-coaching fulfillment campus",
      stage: "pre",
      audience: "client",
      description: "Baseline fulfillment and well-being before first coaching session.",
      schemaJson: JSON.stringify([
        { id: "fulfillment", label: "How fulfilled do you feel at school right now? (1-10)", type: "number" },
        { id: "wellbeing", label: "Overall well-being this week? (1-10)", type: "number" },
        { id: "goal", label: "What do you most want coaching to help with?", type: "text" },
      ]),
    },
    {
      key: "mid_coaching_checkin",
      name: "Mid-program check-in",
      stage: "mid",
      audience: "client",
      description: "Progress pulse during coaching.",
      schemaJson: JSON.stringify([
        { id: "fulfillment", label: "Fulfillment now (1-10)", type: "number" },
        { id: "wellbeing", label: "Well-being now (1-10)", type: "number" },
        { id: "progress", label: "What progress have you noticed?", type: "text" },
      ]),
    },
    {
      key: "post_coaching_impact",
      name: "Post-coaching impact",
      stage: "post",
      audience: "client",
      description: "Impact after coaching block.",
      schemaJson: JSON.stringify([
        { id: "fulfillment", label: "Fulfillment after coaching (1-10)", type: "number" },
        { id: "wellbeing", label: "Well-being after coaching (1-10)", type: "number" },
        { id: "change", label: "What changed for you?", type: "text" },
      ]),
    },
  ];

  for (const template of formTemplates) {
    await prisma.formTemplate.upsert({
      where: { key: template.key },
      update: template,
      create: template,
    });
  }

  await prisma.coachRoster.upsert({
    where: { coachId: "pending-coach" },
    update: {
      email: "pending.coach@example.com",
      name: "Riley Chen",
      status: "active",
      programRoles: JSON.stringify(["teen_coaching"]),
      effectiveAt: new Date("2026-10-01"),
      expiresAt: null,
    },
    create: {
      coachId: "pending-coach",
      email: "pending.coach@example.com",
      name: "Riley Chen",
      status: "active",
      programRoles: JSON.stringify(["teen_coaching"]),
      effectiveAt: new Date("2026-10-01"),
      expiresAt: null,
      sourceEventId: "seed-pending-coach",
    },
  });
  await prisma.user.upsert({
    where: { email: "pending.coach@example.com" },
    update: { role: "coach", coachId: "pending-coach", name: "Riley Chen" },
    create: {
      email: "pending.coach@example.com",
      name: "Riley Chen",
      password,
      role: "coach",
      coachId: "pending-coach",
    },
  });

  const studio = await prisma.internTeam.upsert({
    where: { id: "team-studio" },
    update: { name: "Studio", focus: "Workshops and design" },
    create: {
      id: "team-studio",
      name: "Studio",
      focus: "Workshops and design",
      description: "Plans workshops, flyers, and the pieces other teams hand out.",
    },
  });
  const outreach = await prisma.internTeam.upsert({
    where: { id: "team-outreach" },
    update: { name: "Outreach", focus: "Schools and events" },
    create: {
      id: "team-outreach",
      name: "Outreach",
      focus: "Schools and events",
      description: "Talks with schools and runs tabling.",
    },
  });

  const maya = await prisma.intern.upsert({
    where: { id: "intern-maya" },
    update: { teamId: studio.id, status: "active" },
    create: {
      id: "intern-maya",
      publicId: "INT-10001",
      firstName: "Maya",
      lastName: "Chen",
      email: "maya.chen@example.com",
      teamId: studio.id,
      parentName: "Priya Chen",
      parentEmail: "priya.chen@example.com",
      parentPhone: "555-0140",
      status: "active",
    },
  });
  const leo = await prisma.intern.upsert({
    where: { id: "intern-leo" },
    update: { teamId: outreach.id, status: "pending" },
    create: {
      id: "intern-leo",
      publicId: "INT-10002",
      firstName: "Leo",
      lastName: "Park",
      email: "leo.park@example.com",
      teamId: outreach.id,
      parentName: "Sam Park",
      parentEmail: "sam.park@example.com",
      parentPhone: "555-0141",
      status: "pending",
    },
  });

  await prisma.user.upsert({
    where: { email: "maya.chen@example.com" },
    update: { role: "intern", internId: maya.id, name: "Maya Chen" },
    create: { email: "maya.chen@example.com", name: "Maya Chen", password, role: "intern", internId: maya.id },
  });
  await prisma.user.upsert({
    where: { email: "leo.park@example.com" },
    update: { role: "intern", internId: leo.id, name: "Leo Park" },
    create: { email: "leo.park@example.com", name: "Leo Park", password, role: "intern", internId: leo.id },
  });
  await prisma.user.upsert({
    where: { email: "priya.chen@example.com" },
    update: { role: "intern_parent", name: "Priya Chen" },
    create: { email: "priya.chen@example.com", name: "Priya Chen", password, role: "intern_parent" },
  });
  await prisma.user.upsert({
    where: { email: "sam.park@example.com" },
    update: { role: "intern_parent", name: "Sam Park" },
    create: { email: "sam.park@example.com", name: "Sam Park", password, role: "intern_parent" },
  });

  await prisma.internChannel.upsert({
    where: { key: "all" },
    update: {},
    create: { key: "all", name: "All interns", kind: "all" },
  });
  await prisma.internChannel.upsert({
    where: { key: "between" },
    update: {},
    create: { key: "between", name: "Between teams", kind: "between" },
  });
  await prisma.internChannel.upsert({
    where: { key: "team:team-studio" },
    update: { name: "Studio" },
    create: { key: "team:team-studio", name: "Studio", kind: "team", teamId: studio.id },
  });
  await prisma.internChannel.upsert({
    where: { key: "team:team-outreach" },
    update: { name: "Outreach" },
    create: { key: "team:team-outreach", name: "Outreach", kind: "team", teamId: outreach.id },
  });

  const allChannel = await prisma.internChannel.findUniqueOrThrow({ where: { key: "all" } });
  const betweenChannel = await prisma.internChannel.findUniqueOrThrow({ where: { key: "between" } });
  const studioChannel = await prisma.internChannel.findUniqueOrThrow({ where: { key: "team:team-studio" } });
  if ((await prisma.internMessage.count()) === 0) {
    const mayaUser = await prisma.user.findUniqueOrThrow({ where: { email: "maya.chen@example.com" } });
    const leoUser = await prisma.user.findUniqueOrThrow({ where: { email: "leo.park@example.com" } });
    await prisma.internMessage.createMany({
      data: [
        {
          channelId: studioChannel.id,
          senderId: mayaUser.id,
          senderName: "Maya Chen",
          body: "October workshop outline is in documents. Shout if a section should change.",
        },
        {
          channelId: allChannel.id,
          senderId: leoUser.id,
          senderName: "Leo Park",
          body: "Outreach is tabling Friday. Who can help staff the table from 3 to 5?",
        },
        {
          channelId: betweenChannel.id,
          senderId: mayaUser.id,
          senderName: "Maya Chen",
          body: "Studio can design the flyer if outreach sends the school name and time.",
        },
      ],
    });
  }
  if ((await prisma.internTask.count()) === 0) {
    const mayaUser = await prisma.user.findUniqueOrThrow({ where: { email: "maya.chen@example.com" } });
    const leoUser = await prisma.user.findUniqueOrThrow({ where: { email: "leo.park@example.com" } });
    await prisma.internTask.create({
      data: {
        title: "Finish the October workshop outline",
        detail: "Sections are in the Studio document. Mark this done when the outline is ready to share.",
        status: "doing",
        teamId: studio.id,
        assigneeId: maya.id,
        authorId: mayaUser.id,
        authorName: "Maya Chen",
        dueOn: "2026-10-30",
      },
    });
    await prisma.internTask.create({
      data: {
        title: "Confirm Friday tabling shifts",
        detail: "Lincoln High, 3–5 pm. Two interns at a time. Reply on the task with the hours you can cover.",
        status: "todo",
        teamId: null,
        authorId: leoUser.id,
        authorName: "Leo Park",
        dueOn: "2026-10-30",
      },
    });
    await prisma.internTask.create({
      data: {
        title: "Print the one-page sheet",
        detail: "Outreach only. Studio does not need this.",
        status: "todo",
        teamId: outreach.id,
        assigneeId: leo.id,
        authorId: leoUser.id,
        authorName: "Leo Park",
        dueOn: "2026-10-29",
      },
    });
  }
  if ((await prisma.internDocument.count()) === 0) {
    const mayaUser = await prisma.user.findUniqueOrThrow({ where: { email: "maya.chen@example.com" } });
    const leoUser = await prisma.user.findUniqueOrThrow({ where: { email: "leo.park@example.com" } });
    await prisma.internDocument.createMany({
      data: [
        {
          title: "October workshop outline",
          body: "1. Welcome\n2. What coaching is (and isn't)\n3. How to sign up\n4. Questions\n\nDraft for Studio. Share edits in the Studio channel.",
          teamId: studio.id,
          authorId: mayaUser.id,
          authorName: "Maya Chen",
        },
        {
          title: "Friday tabling plan",
          body: "Lincoln High, front lobby, 3–5 pm. Bring the one-page sheet and the signup QR. Two interns at a time.",
          teamId: null,
          authorId: leoUser.id,
          authorName: "Leo Park",
        },
      ],
    });
  }

  const metricCount = await prisma.metricSnapshot.count({ where: { clientId: client.id } });
  if (metricCount === 0) {
    await prisma.metricSnapshot.createMany({
      data: [
        {
          clientId: client.id,
          stage: "pre",
          wellBeingScore: 5,
          fulfillmentScore: 4,
          notes: "Baseline before coaching",
          capturedAt: new Date("2026-09-01"),
        },
        {
          clientId: client.id,
          stage: "mid",
          wellBeingScore: 7,
          fulfillmentScore: 6,
          notes: "After first coaching block",
          capturedAt: new Date("2026-09-20"),
        },
      ],
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
