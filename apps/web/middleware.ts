import { NextResponse, type NextRequest } from "next/server";

/** Query parameters that change what a page shows. Anything else (tracking tags, _rsc) leaves the static page in place. */
const VIEW_PARAMS = ["q", "mesto", "strana", "brend", "oblast", "opstina"];

/**
 * Static by default, dynamic only when the request needs it. Canonical pages are served from the static cache
 * (re-made daily); a filtered, paged or searched view, and a guide for a visitor with a remembered municipality,
 * is rewritten to the request-time twin under /dyn. The address the visitor sees does not change.
 */
export function middleware(req: NextRequest) {
  const u = req.nextUrl;
  if (u.pathname === "/dyn" || u.pathname.startsWith("/dyn/")) {          // the twin is internal: a direct visit goes to the real address
    const to = u.clone(); to.pathname = u.pathname.slice(4) || "/"; return NextResponse.redirect(to, 308);
  }
  const hasView = VIEW_PARAMS.some((k) => u.searchParams.has(k));
  const rememberedPlace = /^\/(?:(?:en|ru|de)\/)?vodic\/[^/]+$/.test(u.pathname) && req.cookies.has("opstina");
  if (!hasView && !rememberedPlace) return NextResponse.next();
  const to = u.clone(); to.pathname = `/dyn${u.pathname === "/" ? "" : u.pathname}`;
  if (to.pathname === "/dyn") return NextResponse.next();                 // the home page has no query views
  return NextResponse.rewrite(to);
}

export const config = { matcher: ["/((?!api/|_next/|go/|emblems/|geo/|sitemap|robots\\.txt|favicon\\.ico|icon\\.svg|og\\.png|ikonice).*)"] };
