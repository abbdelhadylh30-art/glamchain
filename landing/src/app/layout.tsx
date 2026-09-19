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
  metadataBase: new URL("https://glamchain.abdelhadygabriel.me"),
  alternates: { canonical: "/" },
  title: `${businessConfig.name} — Maison de Beauté · Salon in West Bay, Doha`,
  description: `A warm, luminous sanctuary for hair, skin and self. Signature rituals, master stylists and effortless online booking at ${businessConfig.name}, Doha's boutique salon.`,
  keywords: ["luxury salon", "doha salon", "west bay salon", "hair", "balayage", "keratin", "bridal", "manicure", "spa", businessConfig.name],
  authors: [{ name: businessConfig.name }],
  openGraph: {
    title: `${businessConfig.name} — Maison de Beauté`,
    description: `Doha's boutique luxury salon. Signature rituals, master stylists, effortless booking.`,
    type: "website",
    // image served automatically from src/app/opengraph-image.tsx (1200×630 brand card)
  },
  twitter: {
    card: "summary_large_image",
    title: `${businessConfig.name} — Maison de Beauté`,
    description: `Doha's boutique luxury salon. Signature rituals, master stylists, effortless booking.`,
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
