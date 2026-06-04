import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function parseDevice(ua: string): string {
  if (/Mobile|Android|iPhone/i.test(ua)) return "Mobile";
  if (/iPad|Tablet/i.test(ua)) return "Tablet";
  return "Desktop";
}

function parseBrowser(ua: string): string {
  if (/Edg\//i.test(ua))     return "Edge";
  if (/OPR\//i.test(ua))     return "Opera";
  if (/Chrome\//i.test(ua))  return "Chrome";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua))  return "Safari";
  return "Other";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const page     = String(body.page     ?? "/").slice(0, 200);
    const referrer = String(body.referrer ?? "").slice(0, 500) || null;

    const ua      = req.headers.get("user-agent") ?? "";
    const device  = parseDevice(ua);
    const browser = parseBrowser(ua);

    // Get real IP (Railway sets x-forwarded-for)
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

    // Free geo lookup — no API key needed
    let country: string | null = null;
    let city:    string | null = null;
    let region:  string | null = null;
    if (ip !== "127.0.0.1" && ip !== "::1") {
      try {
        const geo = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,regionName`, {
          signal: AbortSignal.timeout(2000),
        }).then((r) => r.json());
        if (geo.country) { country = geo.country; city = geo.city ?? null; region = geo.regionName ?? null; }
      } catch {
        // geo lookup failed — continue without it
      }
    }

    await prisma.pageView.create({ data: { page, referrer, country, city, region, device, browser } });

    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch (err) {
    console.error("pageview error:", err);
    return NextResponse.json({ ok: false }, { status: 500, headers: CORS });
  }
}
