import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * The daily job (vercel.json "crons", 03:30 UTC). Two things nothing else does:
 *  1. Enquiries past their keep-until date lose the person's contact and message (leads.purge_after, 180 days after consent).
 *  2. A slice of organisation websites is looked at again, oldest check first, and the answer is stored
 *     (organizations.website_status: the HTTP status, 0 when the site did not answer). About 400 a day, so every known
 *     site is seen roughly once every five weeks. Nothing is removed from a page by this job; it only records.
 * When CRON_SECRET is set in the project, Vercel sends it as a bearer token and any other caller is refused.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH = 400, PARALLEL = 40, TIMEOUT_MS = 6000;
const UA = "Mozilla/5.0 (compatible; GdeDaIdemLinkCheck/1.0)";

async function look(url: string): Promise<number> {
  const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  for (const method of ["HEAD", "GET"] as const) {
    try {
      const r = await fetch(target, { method, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": UA } });
      if (method === "HEAD" && (r.status === 405 || r.status === 403 || r.status === 501)) continue;   // some servers refuse HEAD
      return r.status;
    } catch { if (method === "GET") return 0; }
  }
  return 0;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });

  const purged = await sql`update leads set contact_email = null, contact_phone = null, payload = '{}'::jsonb, ip_hash = null, user_agent = null
    where purge_after < current_date and (contact_email is not null or contact_phone is not null) returning id`;

  const started = Date.now();
  const rows = await sql<{ id: number; website: string }[]>`select id, website from organizations
    where status = 'active' and website is not null and website <> '' order by website_checked_at nulls first, id limit ${BATCH}`;
  const results: { id: number; status: number }[] = [];
  for (let i = 0; i < rows.length && Date.now() - started < 45_000; i += PARALLEL) {
    const part = rows.slice(i, i + PARALLEL);
    const got = await Promise.all(part.map((r) => look(r.website)));
    part.forEach((r, j) => results.push({ id: r.id, status: got[j] }));
  }
  // one row at a time: a short lock each, never a long transaction on a table every page reads
  for (const r of results) await sql`update organizations set website_checked_at = now(), website_status = ${r.status} where id = ${r.id}`;
  return NextResponse.json({ ok: true, purged: purged.length, checked: results.length, dead: results.filter((r) => r.status === 0 || r.status >= 400).length });
}
