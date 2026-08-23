import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getBusinessConfig } from "@/lib/config";
import { SessionProvider } from "@/components/auth/session-provider";

const businessConfig = getBusinessConfig();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${businessConfig.name} - Salon Chain Dashboard`,
  description: `Comprehensive dashboard for managing your ${businessConfig.name} salon chain operations, appointments, stylists, and finances.`,
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
