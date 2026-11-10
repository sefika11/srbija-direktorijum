// The request-time twin of the catch-all page. Canonical pages (/beograd, /banka, /vodic/pasos) are static and
// re-made once a day, so a page view does not touch the database. A view that depends on the request (a filter, a
// page number, a search, a remembered municipality) is rewritten here by middleware.ts and rendered on demand.
// Visitors never see /dyn in the address bar.
import Page, { generateMetadata } from "../../[...path]/page";
export const dynamic = "force-dynamic";
export { generateMetadata };
export default Page;
