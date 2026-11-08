/** Runs once when the server starts: make sure the database has what newer features need. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
