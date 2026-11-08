export function emailConfig() {
  return {
    enabled: process.env.EMAIL_ENABLED === "true" && process.env.EMAIL_PROVIDER !== "none",
    provider: process.env.EMAIL_PROVIDER || "none",
    from: process.env.EMAIL_FROM || "",
    appUrl: process.env.APP_URL || "http://localhost:3000",
  };
}
