import { metaFor, renderPage } from "../_shared/catchall";

// Static and re-made once a day: a page view costs no database time. This file must not read the query string or
// cookies (doing so in a static route is a server error); views that depend on the request are rendered by
// app/dyn/[...path], where middleware.ts sends them.
export const revalidate = 86400;
export const dynamicParams = true;
export const dynamic = "force-static";
export async function generateStaticParams() { return []; }   // nothing at build time; each path is made on its first visit

type Props = { params: Promise<{ path: string[] }> };
export async function generateMetadata({ params }: Props) { return metaFor((await params).path, {}); }
export default async function Page({ params }: Props) { return renderPage((await params).path, {}, null); }
