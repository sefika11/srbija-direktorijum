import { NextResponse } from "next/server";
import { notifyEditor } from "@/lib/notify";
import { createHash } from "node:crypto";
import { insertClaim } from "@/lib/db";

/** A business claims its row (docs/08 §3.1). Stored as pending; verified by the editor. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!b || !Number(b.org_id) || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || typeof b.name !== "string" || !b.name.trim()) return NextResponse.json({ ok: false }, { status: 400 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ip_hash = ip ? createHash("sha256").update(ip + new Date().toISOString().slice(0, 10)).digest("hex") : null;
  await insertClaim({ org_id: Number(b.org_id), location_id: b.location_id ? Number(b.location_id) : null, claimant_name: String(b.name).slice(0, 160), claimant_role: b.role ? String(b.role).slice(0, 120) : null,
    email: email.slice(0, 200), phone: b.phone ? String(b.phone).slice(0, 40) : null, message: b.message ? String(b.message).slice(0, 2000) : null, ip_hash });
  await notifyEditor("preuzimanje stranice", null);
  return NextResponse.json({ ok: true });
}
