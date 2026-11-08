import { NextRequest, NextResponse } from "next/server";
import { COACH_STATUS_EVENT_VERSION, type CoachStatusEvent } from "@/contracts/coach-status";
import { verifyPayload } from "@/lib/hmac";
import { ingestCoachStatus } from "@/lib/ingest-coach-status";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-cm2-signature") ?? "";
  const secret = process.env.COACH_STATUS_SECRET ?? "shared-dev-secret-change-in-production";

  if (!verifyPayload(body, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: CoachStatusEvent;
  try {
    event = JSON.parse(body) as CoachStatusEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.version !== COACH_STATUS_EVENT_VERSION || !event.coachId || !event.email) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const roster = await ingestCoachStatus(event);
  return NextResponse.json({ ok: true, coachId: roster.coachId, status: roster.status });
}
