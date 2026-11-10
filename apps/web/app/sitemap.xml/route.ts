// Sitemap index at the conventional address: /sitemap.xml lists the chunked sitemaps that app/sitemap.ts serves under /sitemap/<n>.xml.
import { sql } from "@/lib/db";
export const revalidate = 86400;
export async function GET() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100").replace(/\/$/, "");
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from organizations o where o.status = 'active' and exists (select 1 from locations l where l.org_id = o.id)`;
  const ids = Array.from({ length: 1 + Math.ceil(n / 4000) }, (_, i) => i);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${ids.map((i) => `<sitemap><loc>${base}/sitemap/${i}.xml</loc></sitemap>`).join("\n")}\n</sitemapindex>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=86400" } });
}
