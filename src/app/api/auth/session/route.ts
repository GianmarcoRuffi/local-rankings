import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionJWT } from "@/lib/jwt";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token");

    if (!sessionToken) {
      return NextResponse.json({ session: null }, { status: 200 });
    }

    const payload = await verifySessionJWT(sessionToken.value);

    if (!payload) {
      return NextResponse.json({ session: null }, { status: 200 });
    }

    return NextResponse.json({
      session: {
        userId: payload.userId,
        username: payload.username,
        displayName: payload.displayName,
      },
    });
  } catch (error) {
    console.error("[Session API] Error:", error);
    return NextResponse.json({ session: null }, { status: 200 });
  }
}
