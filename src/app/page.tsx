import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homeFor } from "@/lib/gate";

/** The portal has no public homepage: signed-in people go to their home, everyone else to sign in. */
export default async function Root() {
  const user = await getSession();
  redirect(user ? await homeFor(user) : "/login");
}
