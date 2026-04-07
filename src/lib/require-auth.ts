import { NextRequest, NextResponse } from "next/server";
import { verifySessionJWT } from "@/lib/jwt";

export async function requireAuth(request: NextRequest): Promise<
  | {
      authorized: true;
      userId: number;
      username: string;
      displayName: string;
    }
  | { authorized: false; response: NextResponse }
> {
  const sessionToken = request.cookies.get("session_token")?.value;

  if (!sessionToken) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Autenticazione richiesta" },
        { status: 401 },
      ),
    };
  }

  const session = await verifySessionJWT(sessionToken);

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Sessione non valida o scaduta" },
        { status: 401 },
      ),
    };
  }

  return {
    authorized: true,
    userId: session.userId,
    username: session.username,
    displayName: session.displayName,
  };
}
