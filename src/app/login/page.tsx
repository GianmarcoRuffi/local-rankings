"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

declare global {
  interface Window {
    onTurnstileSuccess?: (token: string) => void;
    turnstile?: {
      reset: () => void;
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const turnstileSiteKey =
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
      : (window as any).__NEXT_PUBLIC_TURNSTILE_SITE_KEY__ ||
        process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const isTurnstileConfigured = Boolean(turnstileSiteKey);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!isTurnstileConfigured) {
      setError("Captcha non configurato: contatta l'amministratore");
      setLoading(false);
      return;
    }

    if (!captchaToken) {
      setError("Completa la verifica anti-bot");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          captchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Errore durante il login");
        setCaptchaToken("");
        window.turnstile?.reset();
      } else {
        // Forza reload completo per assicurare che il cookie venga letto
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isTurnstileConfigured && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          onLoad={() => {
            window.onTurnstileSuccess = (token: string) => {
              setCaptchaToken(token);
            };
          }}
        />
      )}
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="bg-primary/10 p-4 rounded-full">
                <Trophy className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Local Rankings</CardTitle>
            <CardDescription>
              Accedi per gestire le classifiche del torneo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Inserisci username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Inserisci password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              {isTurnstileConfigured ? (
                <div
                  className="cf-turnstile"
                  data-sitekey={turnstileSiteKey}
                  data-callback="onTurnstileSuccess"
                />
              ) : (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  Captcha obbligatorio non configurato.
                </div>
              )}
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !isTurnstileConfigured}
              >
                {loading ? "Accesso in corso..." : "Accedi"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
