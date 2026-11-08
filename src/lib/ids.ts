import { prisma } from "@/lib/db";

export async function nextClientPublicId() {
  const latest = await prisma.client.findFirst({
    where: { publicId: { startsWith: "CM2-" } },
    orderBy: { publicId: "desc" },
  });

  const next = latest ? Number(latest.publicId.replace("CM2-", "")) + 1 : 10001;
  return `CM2-${String(Number.isFinite(next) ? next : 10001).padStart(5, "0")}`;
}

export async function nextInternPublicId() {
  const latest = await prisma.intern.findFirst({
    where: { publicId: { startsWith: "INT-" } },
    orderBy: { publicId: "desc" },
  });
  const next = latest ? Number(latest.publicId.replace("INT-", "")) + 1 : 10001;
  return `INT-${String(Number.isFinite(next) ? next : 10001).padStart(5, "0")}`;
}

/** Coaches' own clients get their own ID series so they never mix into Coach Me 2 exports. */
export async function nextPrivateClientPublicId() {
  const latest = await prisma.client.findFirst({
    where: { publicId: { startsWith: "PVT-" } },
    orderBy: { publicId: "desc" },
  });
  const next = latest ? Number(latest.publicId.replace("PVT-", "")) + 1 : 10001;
  return `PVT-${String(Number.isFinite(next) ? next : 10001).padStart(5, "0")}`;
}
