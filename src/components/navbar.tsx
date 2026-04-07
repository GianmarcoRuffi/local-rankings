"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Trophy,
  BarChart3,
  Upload,
  LogOut,
  User,
  LogIn,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RankingSelector } from "@/components/ranking-selector";

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
];

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const navItems = user
    ? [...publicNavItems, ...privateNavItems]
    : publicNavItems;

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  const handleLogin = () => {
    router.push("/login");
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-all duration-300",
        isScrolled ? "shadow-md" : "shadow-sm",
      )}
    >
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Main Header Row: Logo, Ranking Selector, User Actions */}
        <div
          className={cn(
            "flex items-center justify-between gap-2 transition-all duration-300",
            isScrolled ? "h-14" : "h-16",
          )}
        >
          {/* Logo Section */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1 sm:gap-2 shrink-0"
          >
            <Trophy
              className={cn(
                "text-primary shrink-0 transition-all duration-300",
                isScrolled ? "h-5 w-5" : "h-6 w-6",
              )}
            />
            <span
              className={cn(
                "font-bold hidden md:inline shrink-0 transition-all duration-300",
                isScrolled ? "text-base" : "text-lg",
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
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "gap-2 transition-all duration-300",
                      isScrolled ? "h-8 px-2 text-xs" : "h-9 px-3",
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
          <div
            className={cn(
              "flex items-center gap-1 sm:gap-2 shrink-0",
              !user && "flex-1 justify-end",
            )}
          >
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
                    onClick={handleLogout}
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
                  onClick={handleLogin}
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
                <span className="max-w-[70px] truncate">
                  {user.name?.split(" ")[0] || "Utente"}
                </span>
              </div>
            )}
            <div className="flex gap-1 overflow-x-auto scrollbar-hide flex-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} className="shrink-0">
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "gap-2 whitespace-nowrap h-8 px-3 text-xs",
                        isActive && "bg-secondary text-secondary-foreground",
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
  );
}
