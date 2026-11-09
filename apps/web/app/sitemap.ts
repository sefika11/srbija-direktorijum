import type { MetadataRoute } from "next";
import { sql } from "@/lib/db";
import { LOCALES, href } from "@/lib/i18n";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";
  const tus = await sql<{ slug: string; level: string; parent_slug: string | null; updated_at: string }[]>`
    select u.slug, u.level::text, p.slug as parent_slug, u.updated_at::text from territorial_units u left join territorial_units p on p.id = u.parent_id
    where u.level in ('okrug','jls','gradska_opstina') and not u.in_kosovo and u.status = 'active'`;
  const types = await sql<{ slug: string }[]>`select slug from org_types where is_active`;
  const orgs = await sql<{ slug: string; type_slug: string; updated_at: string }[]>`
    select o.slug, t.slug as type_slug, o.updated_at::text from organizations o join org_types t on t.id = o.org_type_id
    where o.status = 'active' and exists (select 1 from locations l where l.org_id = o.id)`;
  const out: MetadataRoute.Sitemap = [];
  const push = (path: string, lastModified?: string, priority = 0.5) =>
    out.push({ url: `${base}${path}`, lastModified: lastModified ? new Date(lastModified) : undefined, priority,
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l === "sr" ? "sr-Latn" : l, `${base}${href(l, path)}`])) } });
  push("/", undefined, 1);
  push("/za-strance", undefined, 0.8);
  for (const u of tus) push(u.level === "okrug" ? `/okrug/${u.slug}` : u.level === "jls" ? `/${u.slug}` : `/${u.parent_slug}/${u.slug}`, u.updated_at, u.level === "jls" ? 0.9 : 0.7);
  for (const t of types) push(`/${t.slug}`, undefined, 0.8);
  for (const o of orgs) push(`/${o.type_slug}/${o.slug}`, o.updated_at, 0.6);
  return out;
}
