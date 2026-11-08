import { emailConfig } from "./config";
import { templates } from "./templates";
import { sendWithResend } from "./providers/resend";

export async function sendWorkflowEmail(kind, to, args = {}) {
  const config = emailConfig();
  if (!config.enabled || !config.from || !to) return { sent: false, reason: "Email is disabled." };
  if (config.provider !== "resend") return { sent: false, reason: "Email provider is unavailable." };
  const template = templates[kind];
  if (!template) throw new Error(`Unknown email template: ${kind}`);
  return sendWithResend({ from: config.from, to, ...template(...args) });
}

export function workflowUrl(path, token) {
  const { appUrl } = emailConfig();
  return `${appUrl}${path}?token=${encodeURIComponent(token)}`;
}
