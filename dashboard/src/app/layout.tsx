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
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: `${businessConfig.name} Dashboard`,
    description: "Manage your salon chain with ease",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${businessConfig.name} Dashboard`,
    description: "Manage your salon chain with ease",
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
