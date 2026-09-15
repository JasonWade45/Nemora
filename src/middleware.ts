import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = ["/admin", "/manager", "/rep"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsAuth = PROTECTED.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  // الحماية الفعلية في layouts (rep/layout.tsx, admin/layout.tsx, manager/layout.tsx)
  // ده حماية إضافية لمنع الوصول المباشر
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/manager/:path*", "/rep/:path*"],
};