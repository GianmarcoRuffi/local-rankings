"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import {
  Trophy,
  BarChart3,
  Upload,
  LogOut,
  User,
  LogIn,
  KeyRound,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RankingSelector } from "@/components/ranking-selector";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface NavbarProps {
  user: {
    name?: string | null;
    email?: string | null;
  } | null;
}

const publicNavItems = [
  {
    href: "/dashboard",
    label: "Classifica Generale",
    icon: BarChart3,
  },
  {
    href: "/dashboard/stage",
    label: "Visualizza tappe",
    icon: Trophy,
  },
];

const privateNavItems = [
  {
    href: "/dashboard/upload",
    label: "Aggiungi tappe",
    icon: Upload,
  },
  {
    href: "/dashboard/trash",
    label: "Cestino",
    icon: Trash2,
  },
];

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [trashCount, setTrashCount] = useState(0);
  const navItems = user
    ? [...publicNavItems, ...privateNavItems]
    : publicNavItems;

  const fetchTrashCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/ranking/trash/count");
      if (res.ok) {
        const data = await res.json();
        setTrashCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching trash count:", error);
    }
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Avvia il fetch in modo asincrono per evitare setState sincrono nell'effect
    const initTrashCount = async () => {
      await fetchTrashCount();
    };
    initTrashCount();
    
    // Aggiorna il conteggio ogni 30 secondi
    const interval = setInterval(fetchTrashCount, 30000);
    return () => clearInterval(interval);
  }, [fetchTrashCount]);

  const TrashItem = ({ item, isActive, isScrolled }: { item: typeof privateNavItems[0], isActive: boolean, isScrolled: boolean }) => {
    const Icon = item.icon;
    const button = (
      <Button
        variant={isActive ? "default" : "ghost"}
        size="sm"
        className={cn(
          "gap-2 transition-all duration-300",
          isScrolled ? "h-8 px-2 text-xs" : "h-9 px-3"
        )}
      >
        <Icon className="h-4 w-4" />
        {item.label}
        {trashCount > 0 && (
          <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 text-xs">
            {trashCount > 99 ? '99+' : trashCount}
          </Badge>
        )}
      </Button>
    );

    // Quando il cestino è vuoto, mostra un tooltip che spiega
    if (trashCount === 0) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={item.href}>
              {button}
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>Il cestino è vuoto. Quando elimini classifiche o dati, appariranno qui.</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link href={item.href}>
        {button}
      </Link>
    );
  };

  return (
    <TooltipProvider>
    <nav
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-all duration-300",
        isScrolled ? "shadow-md" : "shadow-sm"
      )}
    >
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Main Header Row: Logo, Ranking Selector, User Actions */}
        <div 
          className={cn(
            "flex items-center justify-between gap-2 transition-all duration-300",
            isScrolled ? "h-14" : "h-16"
          )}
        >
          {/* Logo Section */}
          <Link href="/dashboard" className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Trophy
              className={cn(
                "text-primary shrink-0 transition-all duration-300",
                isScrolled ? "h-5 w-5" : "h-6 w-6"
              )}
            />
            <span
              className={cn(
                "font-bold hidden md:inline shrink-0 transition-all duration-300",
                isScrolled ? "text-base" : "text-lg"
              )}
            >
              Rankings
            </span>
          </Link>

          {/* Nav Items (Desktop only) */}
          <div className="hidden lg:flex items-center gap-1 mx-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              
              // Cestino con badge e tooltip
              if (item.href === "/dashboard/trash") {
                return <TrashItem key={item.href} item={item} isActive={isActive} isScrolled={isScrolled} />;
              }
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "gap-2 transition-all duration-300",
                      isScrolled ? "h-8 px-2 text-xs" : "h-9 px-3"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Right Section: Selector + User Actions */}
          <div className={cn(
            "flex items-center gap-1 sm:gap-2 shrink-0",
            !user && "flex-1 justify-end"
          )}>
            <RankingSelector className={cn(!user && "flex-1")} />
            
            <div className="flex items-center gap-1 border-l border-border ml-1 pl-1 sm:pl-2">
              {user ? (
                <>
                  <div className="hidden lg:flex items-center gap-2 mr-2 text-sm text-muted-foreground max-w-[120px]">
                    <User className="h-4 w-4 shrink-0" />
                    <span className="truncate">{user.name || user.email}</span>
                  </div>
                  <Link href="/dashboard/change-password">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 transition-all duration-300"
                      title="Password"
                    >
                      <KeyRound className="h-4 w-4" />
                      <span className="hidden sm:inline ml-2">Password</span>
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => signOut({ callbackUrl: "/dashboard" })}
                    className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 transition-all duration-300 font-semibold"
                    title="Esci"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Esci</span>
                  </Button>
                </>
              ) : (
                <Button
                  variant="default"
                  size="icon"
                  onClick={() => signIn(undefined, { callbackUrl: "/dashboard" })}
                  className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 transition-all duration-300"
                  title="Accedi"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Accedi</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs Row (Mobile/Tablet only) */}
        <div className="lg:hidden border-t py-2">
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground shrink-0 border-r pr-3">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="max-w-[70px] truncate">{user.name?.split(' ')[0] || 'Utente'}</span>
              </div>
            )}
            <div className="flex gap-1 overflow-x-auto scrollbar-hide flex-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                
                // Cestino mobile con badge
                if (item.href === "/dashboard/trash") {
                  return (
                    <Link key={item.href} href={item.href} className="shrink-0">
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        size="sm"
                        className={cn(
                          "gap-2 whitespace-nowrap h-8 px-3 text-xs",
                          isActive && "bg-secondary text-secondary-foreground"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                        {trashCount > 0 && (
                          <Badge variant="destructive" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">
                            {trashCount > 99 ? '99+' : trashCount}
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  );
                }
                
                return (
                  <Link key={item.href} href={item.href} className="shrink-0">
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "gap-2 whitespace-nowrap h-8 px-3 text-xs",
                        isActive && "bg-secondary text-secondary-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
    </TooltipProvider>
  );
}
