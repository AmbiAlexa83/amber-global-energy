import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export function proxy(request: NextRequest) {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return new NextResponse("Service unavailable: admin credentials not configured.", { status: 503 });
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader && authHeader.startsWith("Basic ")) {
    const encoded = authHeader.slice(6);
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const colonIndex = decoded.indexOf(":");
    if (colonIndex !== -1) {
      const providedUser = decoded.slice(0, colonIndex);
      const providedPass = decoded.slice(colonIndex + 1);
      if (providedUser === username && providedPass === password) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Amber Global Energy Admin"',
    },
  });
}
