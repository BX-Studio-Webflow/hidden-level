import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Add your accepted origins here
const acceptedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173", // Vite default port
  "https://hidden-level-bx.webflow.io",
  "https://www.hiddenlevel.com",
];

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");

  // Check if the origin is in our accepted origins list
  if (origin && acceptedOrigins.includes(origin)) {
    const response = NextResponse.next();

    // Add CORS headers
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    response.headers.set("Access-Control-Max-Age", "86400");

    return response;
  }

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  return NextResponse.next();
}
