import { redirect } from "next/navigation";

export default async function ClientJournalRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/journal?clientId=${id}`);
}
