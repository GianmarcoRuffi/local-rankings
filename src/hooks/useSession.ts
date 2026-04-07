"use client";

import { useState, useEffect } from "react";

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

export function useSession() {
  const [session, setSession] = useState<{
    user: { name: string; email: string };
  } | null>(null);

  useEffect(() => {
    // Initial session check
    fetchSession().then((sessionData) => {
      setSession(sessionData);
    });

    // Poll for session changes every 5 seconds
    const interval = setInterval(() => {
      fetchSession().then((sessionData) => {
        setSession(sessionData);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const status = session
    ? ("authenticated" as const)
    : ("unauthenticated" as const);

  return {
    data: session,
    status,
  };
}
