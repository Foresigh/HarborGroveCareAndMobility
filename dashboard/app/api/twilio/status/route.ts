export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

// Twilio POSTs delivery status updates here.
// Add this URL in Twilio console → Phone Numbers → your number → Messaging → Status Callback URL:
//   https://dashboard.harborgrovecareandmobility.com/api/twilio/status
export async function POST(req: Request) {
  const text = await req.text();
  const params = Object.fromEntries(new URLSearchParams(text));

  const { MessageSid, To, MessageStatus, ErrorCode, ErrorMessage } = params;

  if (ErrorCode) {
    console.error(`SMS DELIVERY FAILED — SID: ${MessageSid} To: ${To} Status: ${MessageStatus} ErrorCode: ${ErrorCode} ErrorMessage: ${ErrorMessage}`);
  } else {
    console.log(`SMS STATUS — SID: ${MessageSid} To: ${To} Status: ${MessageStatus}`);
  }

  return NextResponse.json({ ok: true });
}
