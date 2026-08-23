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
  title: `${businessConfig.name} — Premium Salon Experience`,
  description: `${businessConfig.name} — where beauty meets elegance. Book your appointment online with our expert stylists.`,
  keywords: ["salon", "booking", "appointments", businessConfig.name],
  authors: [{ name: businessConfig.name }],
  openGraph: {
    title: `${businessConfig.name} — Premium Salon Experience`,
    description: `Book your appointment at ${businessConfig.name}.`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${businessConfig.name}`,
    description: `Book your appointment at ${businessConfig.name}.`,
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
