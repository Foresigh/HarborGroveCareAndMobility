import twilio from "twilio";

function normalize(to: string): string | null {
  const n = /^\+/.test(to) ? to : `+1${to.replace(/\D/g, "")}`;
  return n.replace(/\D/g, "").length >= 10 ? n : null;
}

export async function sendSms(to: string, body: string): Promise<void> {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_FROM;
  if (!sid || !token || !from || !to) return;
  const normalized = normalize(to);
  if (!normalized) return;
  try {
    const msg = await twilio(sid, token).messages.create({ body, from, to: normalized });
    console.log(`SMS sent to ${normalized} — SID: ${msg.sid} status: ${msg.status}`);
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string; status?: number };
    console.error(`SMS FAILED to ${normalized} — code: ${e?.code} status: ${e?.status} message: ${e?.message}`);
  }
}

// Sends to all numbers in NOTIFY_PHONE (comma-separated list supported)
export async function notifyOwners(body: string): Promise<void> {
  const raw = process.env.NOTIFY_PHONE ?? "";
  const numbers = raw.split(",").map(n => n.trim()).filter(Boolean);
  await Promise.all(numbers.map(n => sendSms(n, body)));
}
