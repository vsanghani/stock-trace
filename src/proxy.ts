import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Everything not listed here requires a signed-in user.
 *
 * `/api/search` stays public so the landing page's ticker autocomplete works for
 * visitors; it only resolves symbol names and exposes no market data.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/blog(.*)",
  "/about",
  "/company",
  "/privacy",
  "/terms",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/search",
  "/robots.txt",
  "/sitemap.xml",
]);

/** Auth screens stay reachable, but they are not pages we want in a search index. */
const isAuthPage = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

const NOINDEX = "noindex, nofollow";

function withNoindex(response: NextResponse) {
  response.headers.set("X-Robots-Tag", NOINDEX);
  return response;
}

export default clerkMiddleware(async (auth, request) => {
  // The research view used to live at `/?ticker=`. Keep those links working
  // here so the landing page itself can be statically prerendered.
  const ticker = request.nextUrl.searchParams.get("ticker");
  if (request.nextUrl.pathname === "/" && ticker) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    url.searchParams.set("ticker", ticker);
    return withNoindex(NextResponse.redirect(url));
  }

  if (isPublicRoute(request)) {
    if (isAuthPage(request)) {
      return withNoindex(NextResponse.next());
    }
    return;
  }

  // Data endpoints answer with JSON so callers don't have to parse a sign-in page.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const { userId } = await auth();
    if (!userId) {
      return withNoindex(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    return withNoindex(NextResponse.next());
  }

  await auth.protect();
  return withNoindex(NextResponse.next());
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
