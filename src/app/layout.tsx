import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { Footer } from "@/components/footer";
import { CookieConsent } from "@/components/cookie-consent";
import { ScrollToTop } from "@/components/scroll-to-top";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Site configuration constants for consistent metadata
const siteConfig = {
  title: "Rankings Manager",
  description: "visualizza e gestisci le classifiche generali dei tornei.",
};

// Enhanced base URL logic supporting various environments
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  ? (process.env.NEXT_PUBLIC_BASE_URL.startsWith('http')
      ? process.env.NEXT_PUBLIC_BASE_URL
      : `https://${process.env.NEXT_PUBLIC_BASE_URL}`)
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3080";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: siteConfig.title,
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: "./",
    siteName: siteConfig.title,
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <Providers>
          <div className="flex-1 pb-16">{children}</div>
          <Footer />
          <CookieConsent />
          <ScrollToTop />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
