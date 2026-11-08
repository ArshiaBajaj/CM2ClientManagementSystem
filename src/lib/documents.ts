import { prisma } from "@/lib/db";

export type DocumentStatus = {
  id: string;
  key: string;
  title: string;
  body: string;
  version: string;
  signers: string[];
  signed: Record<string, { name: string; at: Date } | null>;
  complete: boolean;
};

/** Each active document with who still needs to sign the current version for this student. */
export async function documentStatusFor(clientId: string): Promise<DocumentStatus[]> {
  const docs = await prisma.documentTemplate.findMany({
    where: { active: true },
    include: { signatures: { where: { clientId } } },
    orderBy: { createdAt: "asc" },
  });
  return docs.map((doc) => {
    const signers = doc.signers.split(",").filter(Boolean);
    const signed = Object.fromEntries(
      signers.map((role) => {
        const sig = doc.signatures.find((s) => s.signerRole === role && s.version === doc.version);
        return [role, sig ? { name: sig.signerName, at: sig.signedAt } : null];
      }),
    );
    return {
      id: doc.id,
      key: doc.key,
      title: doc.title,
      body: doc.body,
      version: doc.version,
      signers,
      signed,
      complete: signers.every((role) => signed[role]),
    };
  });
}
