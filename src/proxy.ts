import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

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
]);

const AUTH_NOT_CONFIGURED_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Service unavailable</title>
</head>
<body>
<main>
<h1>Service unavailable</h1>
<p>Auth is not configured.</p>
</main>
</body>
</html>
`;

function hasValue(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

/** Clerk throws from middleware when either key is absent. Skip it instead. */
function hasClerkKeys(): boolean {
  return (
    hasValue(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    hasValue(process.env.CLERK_SECRET_KEY)
  );
}

/**
 * Same route split as the Clerk handler, but protected routes fail closed.
 * Public pages pass through. Nothing behind auth is rendered.
 */
function proxyWithoutClerk(request: NextRequest): NextResponse {
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "auth not configured" }, { status: 503 });
  }

  return new NextResponse(AUTH_NOT_CONFIGURED_PAGE, {
    status: 503,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

const clerkProxy = clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return;
  }

  // Data endpoints answer with JSON so callers don't have to parse a sign-in page.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return;
  }

  await auth.protect();
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!hasClerkKeys()) {
    return proxyWithoutClerk(request);
  }
  return clerkProxy(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
