import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

/**
 * The program's managers. Each always has an Admin account: it's created (or upgraded to Admin) every time
 * the server starts, and "Start fresh" never removes it. They sign in with Google, or with a password
 * another manager issues from Settings → Sign-in help.
 */
export const PROGRAM_MANAGERS = [
  { email: "arshiabajaj2022@gmail.com", name: "Arshia Bajaj" },
  { email: "rebecca@cm2.world", name: "Rebecca Oertell" },
];

export const PROGRAM_MANAGER_EMAILS = new Set(PROGRAM_MANAGERS.map((m) => m.email));

export async function ensureProgramManagers() {
  for (const manager of PROGRAM_MANAGERS) {
    const existing = await prisma.user.findUnique({ where: { email: manager.email } });
    if (!existing) {
      // No one knows this password; the first sign-in is with Google or a temporary password.
      await prisma.user.create({
        data: {
          email: manager.email,
          name: manager.name,
          role: "admin",
          password: hashPassword(randomBytes(32).toString("hex")),
        },
      });
    } else if (existing.role !== "admin" || existing.internId || existing.clientId || existing.coachId) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "admin", internId: null, clientId: null, coachId: null },
      });
    }
  }
}
