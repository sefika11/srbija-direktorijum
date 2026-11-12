import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

/** For an uptime monitor: 200 with a few counts when the database answers, 503 when it does not. No personal data. */
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const started = Date.now();
    const [r] = await sql<{ orgs: number; waiting: number; last_check: string | null }[]>`select
      (select count(*)::int from organizations where status = 'active') as orgs,
      (select count(*)::int from edit_suggestions where status = 'pending') + (select count(*)::int from listing_claims where status = 'pending') + (select count(*)::int from leads where status = 'new' and not honeypot_tripped) as waiting,
      (select max(website_checked_at)::text from organizations) as last_check`;
    return NextResponse.json({ ok: true, organisations: r.orgs, waiting_for_editor: r.waiting, last_daily_job: r.last_check, db_ms: Date.now() - started }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
