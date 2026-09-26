import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { UserProvider } from "@/context/UserContext";
import { PWAProvider } from "@/context/PWAContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Benix Games",
    template: "%s | Benix Games",
  },
  description: "Benix Games - Provably fair casino dice wagering platform with instant mobile money deposits and payouts.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RollDice",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PWAProvider>
          <UserProvider>
            <AppShell>{children}</AppShell>
            <PWAInstallPrompt />
          </UserProvider>
        </PWAProvider>
      </body>
    </html>
  );
}
