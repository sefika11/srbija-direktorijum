import type { MetadataRoute } from "next";
import { sql } from "@/lib/db";

export const revalidate = 86400;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from organizations o where o.status = 'active' and exists (select 1 from locations l where l.org_id = o.id)`;
  const ids = Array.from({ length: 1 + Math.ceil(n / 4000) }, (_, i) => i);
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/pretraga", "/go/"] }], sitemap: ids.map((i) => `${base}/sitemap/${i}.xml`) };
}
