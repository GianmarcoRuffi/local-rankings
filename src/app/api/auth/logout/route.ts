import { verifySessionJWT } from "@/lib/jwt";
import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get("session_token")?.value;

  if (sessionToken) {
    const payload = await verifySessionJWT(sessionToken);
    if (payload) await deleteSession(payload.jti);
  }

  const response = NextResponse.json({ success: true });

  response.cookies.delete("session_token");

  return response;
}
