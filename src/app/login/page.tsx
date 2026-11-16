"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
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
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        "expired-callback": () => void;
        "error-callback": (code: string) => void;
        "timeout-callback": () => void;
      }) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    __NEXT_PUBLIC_TURNSTILE_SITE_KEY__?: string;
  }
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const captchaContainer = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [captchaError, setCaptchaError] = useState("");
  const turnstileSiteKey =
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
      : window.__NEXT_PUBLIC_TURNSTILE_SITE_KEY__ ||
        process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const isTurnstileConfigured = Boolean(turnstileSiteKey);

  const resetCaptcha = useCallback(() => {
    setCaptchaToken("");
    if (widgetId.current !== null) {
      window.turnstile?.reset(widgetId.current);
    }
  }, []);

  useEffect(() => {
    if (!scriptReady || !captchaContainer.current || !window.turnstile || !turnstileSiteKey) return;

    const turnstile = window.turnstile;
    const id = turnstile.render(captchaContainer.current, {
      sitekey: turnstileSiteKey,
      callback: (token) => {
        setCaptchaToken(token);
        setCaptchaError("");
      },
      "expired-callback": () => {
        setCaptchaError("Verifica scaduta. Completa nuovamente la verifica anti-bot.");
        resetCaptcha();
      },
      "timeout-callback": () => {
        setCaptchaError("Tempo di verifica scaduto. Riprova.");
        resetCaptcha();
      },
      "error-callback": (code) => {
        setCaptchaToken("");
        setCaptchaError(`Verifica Cloudflare non riuscita (codice ${code}). Riprova.`);
      },
    });
    widgetId.current = id;
    return () => {
      turnstile.remove(id);
      widgetId.current = null;
    };
  }, [scriptReady, turnstileSiteKey, resetCaptcha]);

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
        resetCaptcha();
      } else {
        setRedirecting(true);
        // Forza reload completo per assicurare che il cookie venga letto
        // Reload initializes the authenticated server navbar and shared session provider.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/dashboard";
        return;
      }
    } catch {
      setError("Errore di connessione");
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isTurnstileConfigured && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={() => setScriptReady(true)}
          onError={() => setCaptchaError("Impossibile caricare la verifica Cloudflare. Controlla la connessione e ricarica la pagina.")}
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
                <div ref={captchaContainer} />
              ) : (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  Captcha obbligatorio non configurato.
                </div>
              )}
              {captchaError && (
                <div role="alert" className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {captchaError}
                  {scriptReady && (
                    <Button type="button" variant="outline" className="mt-2" onClick={resetCaptcha}>
                      Riprova la verifica
                    </Button>
                  )}
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
                disabled={loading || redirecting || !isTurnstileConfigured || !captchaToken}
              >
                {loading || redirecting ? "Accesso in corso..." : "Accedi"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
