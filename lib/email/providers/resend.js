export async function sendWithResend({ from, to, subject, html }) {
  if (!process.env.RESEND_API_KEY) return { sent: false, reason: "Email provider is not configured." };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}.`);
  return { sent: true };
}
