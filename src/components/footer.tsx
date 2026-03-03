"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function Footer() {
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Calcola se siamo vicini al fondo della pagina (entro 20px)
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      
      if (windowHeight + scrollTop >= documentHeight - 20) {
        setIsAtBottom(true);
      } else {
        setIsAtBottom(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Esegui subito per impostare lo stato iniziale
    handleScroll();
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <footer 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 text-center text-muted-foreground transition-all duration-500 ease-in-out",
        isAtBottom 
          ? "py-4 text-sm translate-y-0" 
          : "py-2 text-[10px] opacity-70 translate-y-1"
      )}
    >
      <div className="container mx-auto px-4">
        <p className="transition-all duration-500">
          © Made with ❤️ by Gianmarco Ruffi 
          <span className="hidden sm:inline ml-1 italic">
            - "Massima dedizione alla causa! (cit.)"
          </span>
        </p>
      </div>
    </footer>
  );
}

