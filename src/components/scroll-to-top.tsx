"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Mostra il pulsante se abbiamo scrollato per più di 300px
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <Button
      variant="secondary"
      size="icon"
      className={cn(
        "fixed bottom-4 right-4 z-50 rounded-full shadow-md transition-all duration-300 opacity-0 scale-90",
        isVisible && "opacity-100 scale-100",
        // Spostalo un po' più su se il cookie consent è visibile su mobile (opzionale)
        "sm:bottom-8 sm:right-8"
      )}
      onClick={scrollToTop}
      aria-label="Torna in alto"
    >
      <ChevronUp className="h-5 w-5" />
    </Button>
  );
}
