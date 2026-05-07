import { SignJWT, jwtVerify } from "jose";
import { SESSION_DURATION_SECONDS } from "@/lib/constants";

// Usa direttamente process.env per compatibilità Edge Runtime
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET or NEXTAUTH_SECRET must be set");
  }

  return new TextEncoder().encode(secret);
};

export interface SessionPayload {
  userId: number;
  username: string;
  displayName: string;
  iat: number;
  exp: number;
}

export async function createSessionJWT(
  userId: number,
  username: string,
  displayName: string,
): Promise<string> {
  const token = await new SignJWT({
    userId,
    username,
    displayName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getJWTSecret());

  return token;
}

export async function verifySessionJWT(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const verified = await jwtVerify(token, getJWTSecret());
    const payload = verified.payload;

    if (
      typeof payload.userId === "number" &&
      typeof payload.username === "string" &&
      typeof payload.displayName === "string" &&
      typeof payload.iat === "number" &&
      typeof payload.exp === "number"
    ) {
      return payload as unknown as SessionPayload;
    }

    return null;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}
