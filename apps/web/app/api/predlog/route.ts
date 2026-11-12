import { NextResponse } from "next/server";
import { notifyEditor } from "@/lib/notify";
import { createHash } from "node:crypto";
import { insertSuggestion } from "@/lib/db";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || !b.entity_type || !b.kind || typeof b.message !== "string" || b.message.length > 2000) return NextResponse.json({ ok: false }, { status: 400 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ip_hash = ip ? createHash("sha256").update(ip + new Date().toISOString().slice(0, 10)).digest("hex") : null;
  await insertSuggestion({ entity_type: String(b.entity_type), entity_id: b.entity_id ? Number(b.entity_id) : null, kind: String(b.kind), patch: {},
    message: b.message, reporter_email: b.email ? String(b.email).slice(0, 200) : null, ip_hash, user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null, page_path: String(b.page_path ?? "").slice(0, 300) });
  await notifyEditor("ispravka", typeof b.page_path === "string" ? b.page_path.slice(0, 300) : null);
  return NextResponse.json({ ok: true });
}
