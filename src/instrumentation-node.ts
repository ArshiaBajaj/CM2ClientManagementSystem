import { ensureSchema } from "@/lib/schema-upgrades";

// Node.js only (see instrumentation.ts). Adds missing tables and columns; never removes anything.
if (process.env.DATABASE_URL) {
  try {
    await ensureSchema();
  } catch (error) {
    console.error("Schema upgrade skipped:", error);
  }
}
