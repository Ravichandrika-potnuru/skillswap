export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { installNeonAuthPinnedFetch } = await import("./lib/neon-auth-fetch.js");
    const installed = installNeonAuthPinnedFetch();
    console.info("[neon-auth-dns] local resolver", JSON.stringify({ pinConfigured: Boolean(process.env.NEON_AUTH_ENDPOINT_IP), installed }));
  }
}
