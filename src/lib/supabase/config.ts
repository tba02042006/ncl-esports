/** Accept only public project keys. Never allow an accidentally pasted service key to bypass RLS. */
export function validatePublicConfig(url: string, key: string) {
  key = key.trim();
  const parsed = new URL(url);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(
    parsed.hostname,
  );
  if (
    parsed.protocol !== "https:" &&
    !(loopback && parsed.protocol === "http:")
  )
    throw new Error("Hosted Supabase connections require HTTPS.");
  if (parsed.username || parsed.password)
    throw new Error("Supabase URL must not contain credentials.");
  if (key.startsWith("sb_secret_"))
    throw new Error("Use a publishable key, never a secret/service-role key.");
  if (key.split(".").length === 3) {
    try {
      const claims = JSON.parse(
        Buffer.from(key.split(".")[1], "base64url").toString(),
      );
      if (claims.role === "service_role")
        throw new Error(
          "Service-role keys are prohibited. Use the public anon or publishable key.",
        );
    } catch (error) {
      if (error instanceof Error && error.message.includes("Service-role"))
        throw error;
    }
  }
  return { url: parsed.origin, key };
}
