import { NextResponse, type NextRequest } from "next/server";
import { tools } from "@/lib/tools";

export function proxy(request: NextRequest) {
  const isTool = tools.some((tool) => request.nextUrl.pathname === `/tools/${tool.slug}`);

  // Reject unknown paths before Cache Components starts streaming a 200 response.
  if (!isTool) {
    return NextResponse.rewrite(new URL("/404", request.url), { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/tools/:path*",
};
