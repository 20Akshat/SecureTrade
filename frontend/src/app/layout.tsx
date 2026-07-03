// App Root Layout
import type { Metadata } from "next";
import "./globals.css";

// Contexts aur naya MainLayout import kar rahe hain
import { AuthProvider } from "@/context/AuthContext";
import { MarketProvider } from "@/context/MarketContext";
import MainLayout from "@/components/MainLayout";

export const metadata: Metadata = {
  title: "SecureTrade - Premium AI-Powered Automated Trading Brokerage Platform",
  description: "Experience next-generation automated paper trading and intelligence with SecureTrade. Access real-time options chain signals, 5EMA breakouts, advanced risk management tools, and live market statistics.",
  keywords: ["SecureTrade", "Secure Trade", "AI Trading", "Automated Trading Bot", "Options Trading", "Nifty 50 Signals", "Sensex Algorithmic Trading", "5EMA Breakout Strategy", "Indian Market Algo"],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "SecureTrade - Premium AI-Powered Automated Trading Brokerage Platform",
    description: "Experience next-generation automated paper trading and intelligence with SecureTrade.",
    url: "https://securetrade.in",
    siteName: "SecureTrade",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <MarketProvider>
            {/* YAHAN HAI MAGIC JAHAN SE SIDEBAR AAYEGA! */}
            <MainLayout>
              {children}
            </MainLayout>
          </MarketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}