// Runs once when the server starts. A malformed setting stops it here with every problem
// named, rather than surfacing later as broken pages.
export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    return;
  }
  const { serverConfigProblems } = await import("@/platform/config/server-config");
  const problems = serverConfigProblems(process.env);
  if (problems.length > 0) {
    throw new Error(`Invalid configuration:\n- ${problems.join("\n- ")}`);
  }
}
