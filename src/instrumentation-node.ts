import { ensureSchema } from "@/lib/schema-upgrades";
import { ensureProgramManagers } from "@/lib/managers";

// Node.js only (see instrumentation.ts). Adds missing tables and columns (never removes anything),
// then makes sure the program managers have Admin accounts.
if (process.env.DATABASE_URL) {
  try {
    await ensureSchema();
  } catch (error) {
    console.error("Schema upgrade skipped:", error);
  }
  try {
    await ensureProgramManagers();
  } catch (error) {
    console.error("Manager accounts check skipped:", error);
  }
}
