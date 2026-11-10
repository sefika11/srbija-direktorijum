import { NextResponse } from "next/server";
import { suggest } from "@/lib/search";
import { sql } from "@/lib/db";
import { LOCALES, type Locale } from "@/lib/i18n";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") ?? "").slice(0, 80);
  const l = (u.searchParams.get("l") ?? "sr") as Locale;
  if (q.trim().length < 2) return NextResponse.json([]);
  // The search box reports a query that stayed on screen without a clear answer: it goes to search_log as a miss,
  // which is what tools/search/misses.py lists so the missing word can be added to the lexicon. No user data is stored.
  if (u.searchParams.get("miss") === "1") {
    if (q.trim().length >= 4) await sql`insert into search_log (q, locale, place_slug, n_results, best_kind) values (${q.trim().slice(0, 80)}, ${LOCALES.includes(l) ? l : "sr"}, null, 0, 'miss')`.catch(() => {});
    return new NextResponse(null, { status: 204 });
  }
  const scope = (u.searchParams.get("scope") ?? "").slice(0, 80) || null;
  const items = await suggest(q, LOCALES.includes(l) ? l : "sr", scope);
  return NextResponse.json(items, { headers: { "cache-control": "public, s-maxage=600, stale-while-revalidate=86400" } });
}
