import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { insertLead } from "@/lib/db";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || !b.vertical || !b.payload || !b.payload.telefon || b.payload.consent == null) return NextResponse.json({ ok: false }, { status: 400 });
  const honeypot = Boolean(b.payload.website_url);
  const phone = String(b.payload.telefon).replace(/[^\d+]/g, "");
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const day = new Date().toISOString().slice(0, 10);
  const dedupe_hash = createHash("sha256").update(`${b.vertical}|${phone}|${day}`).digest("hex");
  const ip_hash = ip ? createHash("sha256").update(ip + day).digest("hex") : null;
  const { website_url, consent, ...payload } = b.payload;
  await insertLead({ vertical_slug: String(b.vertical), page_path: String(b.page_path ?? "").slice(0, 300), location_id: b.location_id ? Number(b.location_id) : null,
    territorial_unit_id: b.territorial_unit_id ? Number(b.territorial_unit_id) : null, payload, contact_phone: phone, contact_email: payload.email ? String(payload.email) : null,
    dedupe_hash, consent_version: "2026-11-v1", ip_hash, user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null, honeypot });
  return NextResponse.json({ ok: true });
}
