// The request-time twin of the catch-all page. Canonical pages (/beograd, /banka, /vodic/pasos) are static and
// re-made once a day, so a page view does not touch the database. A view that depends on the request (a filter, a
// page number, a search, a remembered municipality) is rewritten here by middleware.ts and rendered on demand.
// Visitors never see /dyn in the address bar.
import { cookies } from "next/headers";
import { metaFor, renderPage, type Query } from "../../_shared/catchall";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ path: string[] }>; searchParams: Promise<Query> };
export async function generateMetadata({ params, searchParams }: Props) { return metaFor((await params).path, await searchParams); }
export default async function Page({ params, searchParams }: Props) {
  return renderPage((await params).path, await searchParams, (await cookies()).get("opstina")?.value ?? null);
}
