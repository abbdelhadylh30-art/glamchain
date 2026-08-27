import type { Metadata } from "next";
import { Playfair_Display, Manrope } from "next/font/google";
import "./globals.css";
import { getBusinessConfig } from "@/lib/config";
import { SessionProvider } from "@/components/auth/session-provider";

const businessConfig = getBusinessConfig();

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: `${businessConfig.name} — Salon Studio`,
  description: `The command centre for your ${businessConfig.name} salon — today's chair, your guests, and the marketing that fills the quiet hours.`,
  keywords: ["salon", "dashboard", "appointments", "stylists", "chain management"],
  authors: [{ name: businessConfig.name }],
  // favicon (icon.svg / apple-icon / favicon.ico) + OG image served from src/app/ file conventions
  openGraph: {
    title: `${businessConfig.name} Studio — Salon Command Centre`,
    description: "Today's chair, your guests, and the marketing that fills the quiet hours — one calm workspace.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${businessConfig.name} Studio — Salon Command Centre`,
    description: "Today's chair, your guests, and the marketing that fills the quiet hours — one calm workspace.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${playfair.variable} ${manrope.variable} antialiased bg-background text-foreground font-sans`}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
