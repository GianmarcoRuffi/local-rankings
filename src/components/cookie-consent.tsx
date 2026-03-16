"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return !localStorage.getItem("cookieConsent");
  });

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border p-4 shadow-lg">
      <div className="container mx-auto flex items-center justify-between gap-4 max-w-7xl">
        <p className="text-sm text-muted-foreground">
          Navigando su questo sito accetti l&apos;utilizzo di cookie per migliorare
          l&apos;esperienza utente e analizzare il traffico.
        </p>
        <Button
          variant="default"
          size="sm"
          onClick={handleAccept}
          className="flex-shrink-0"
        >
          Accetto
        </Button>
      </div>
    </div>
  );
}
