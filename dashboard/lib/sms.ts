import twilio from "twilio";

export async function sendSms(to: string, body: string): Promise<void> {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_FROM;
  if (!sid || !token || !from || !to) return;

  // Normalize to E.164 if bare 10-digit number passed
  const normalized = /^\+/.test(to) ? to : `+1${to.replace(/\D/g, "")}`;
  if (normalized.replace(/\D/g, "").length < 10) return;

  try {
    const client = twilio(sid, token);
    await client.messages.create({ body, from, to: normalized });
  } catch (err) {
    console.error("SMS error:", err);
  }
}
