import { cookies } from "next/headers";
import { Navbar } from "@/components/navbar";
import { verifySessionJWT } from "@/lib/jwt";

async function getUserFromSession() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token");

    if (!sessionToken) {
      return null;
    }

    const payload = await verifySessionJWT(sessionToken.value);

    if (!payload) {
      return null;
    }

    return {
      name: payload.displayName || payload.username,
      email: null,
    };
  } catch (error) {
    console.error("[NavbarWrapper] Error verifying session:", error);
    return null;
  }
}

export async function NavbarWrapper() {
  const user = await getUserFromSession();

  return <Navbar user={user} />;
}
