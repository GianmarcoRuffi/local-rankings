"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

async function fetchSession(): Promise<{
  user: { name: string; email: string };
} | null> {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "include",
    });
    const data = await response.json();

    if (!data.session) {
      return null;
    }

    return {
      user: {
        name: data.session.displayName || data.session.username,
        email: data.session.username,
      },
    };
  } catch (error) {
    console.error("[useSession] Error fetching session:", error);
    return null;
  }
}

function useSessionState() {
  const [session, setSession] = useState<{
    user: { name: string; email: string };
  } | null>(null);

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // Initial session check
    fetchSession().then((sessionData) => {
      setSession(sessionData);
      setLoading(false);
    });

    // Poll for session changes every 5 seconds
    const interval = setInterval(() => {
      fetchSession().then((sessionData) => {
        setSession(sessionData);
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const status = loading ? ("loading" as const) : session
    ? ("authenticated" as const)
    : ("unauthenticated" as const);

  return {
    data: session,
    status,
  };
}

const SessionContext = createContext<ReturnType<typeof useSessionState> | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const value = useSessionState();
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("SessionProvider is required");
  return value;
}
