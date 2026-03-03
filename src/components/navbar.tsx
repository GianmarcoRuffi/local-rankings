"use client";

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
  const navItems = user
    ? [...publicNavItems, ...privateNavItems]
    : publicNavItems;

  return (
    <nav className="border-b bg-card shadow-sm">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-16 items-center justify-between gap-1 md:gap-4">
          <div className="flex items-center gap-1 md:gap-6 shrink-0">
            <Link href="/dashboard" className="flex items-center gap-1 sm:gap-2">
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              <span className="font-bold text-base sm:text-lg hidden xs:inline shrink-0">
                Rankings
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
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
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-3 shrink-0">
            <RankingSelector />
            <div className="hidden sm:flex items-center gap-1 md:gap-3">
              {user ? (
                <>
                  <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span className="hidden xl:inline">
                      {user.name || user.email}
                    </span>
                  </div>
                  <Link href="/dashboard/change-password">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 gap-2"
                      title="Cambia password"
                    >
                      <KeyRound className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline">Cambia password</span>
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => signOut({ callbackUrl: "/dashboard" })}
                    className="h-9 px-4 gap-2 text-destructive hover:text-destructive"
                    title="Esci"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">Esci</span>
                  </Button>
                </>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    signIn(undefined, { callbackUrl: "/dashboard" })
                  }
                  className="h-9 px-4 gap-2"
                  title="Accedi"
                >
                  <LogIn className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Accedi</span>
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="md:hidden flex flex-col gap-2 pb-3">
          <div className="flex gap-1 overflow-x-auto -mx-4 px-4 scrollbar-hide">
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
                    className={cn("gap-2 whitespace-nowrap shrink-0 px-2")}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="hidden xs:inline">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
          <div className="sm:hidden flex items-center justify-end gap-1 px-1 pt-1 border-t border-border/50">
            {user ? (
              <>
                <Link href="/dashboard/change-password">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-2 text-xs"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Password
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/dashboard" })}
                  className="h-8 gap-2 text-xs text-destructive hover:text-destructive"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Esci
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => signIn(undefined, { callbackUrl: "/dashboard" })}
                className="h-8 gap-2 text-xs"
              >
                <LogIn className="h-3.5 w-3.5" />
                Accedi
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
