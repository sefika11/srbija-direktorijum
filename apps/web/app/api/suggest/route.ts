import { NextResponse } from "next/server";
import { suggest } from "@/lib/search";
import { LOCALES, type Locale } from "@/lib/i18n";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") ?? "").slice(0, 80);
  const l = (u.searchParams.get("l") ?? "sr") as Locale;
  if (q.trim().length < 2) return NextResponse.json([]);
  const scope = (u.searchParams.get("scope") ?? "").slice(0, 80) || null;
  const items = await suggest(q, LOCALES.includes(l) ? l : "sr", scope);
  return NextResponse.json(items, { headers: { "cache-control": "public, s-maxage=600, stale-while-revalidate=86400" } });
}
