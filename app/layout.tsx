import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://amberglobalenergy.in"),
  title: "Amber Global Energy | Premium International Energy Brokerage",
  description:
    "Amber Global Energy is a premium international energy brokerage connecting buyers and suppliers across global markets for crude oil, LNG, Jet A1, EN590 diesel, refined products, and supplier partnerships.",
  keywords: [
    "global energy brokerage",
    "crude oil",
    "LNG",
    "Jet A1",
    "EN590 Diesel",
    "refined products",
    "supplier partnerships",
    "international energy markets",
    "commodity trading",
  ],
  openGraph: {
    title: "Amber Global Energy | Premium International Energy Brokerage",
    description:
      "Premium international energy brokerage and commercial partnerships across global energy markets.",
    url: "https://amberglobalenergy.in",
    siteName: "Amber Global Energy",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Amber Global Energy | Premium International Energy Brokerage",
    description:
      "Premium international energy brokerage and commercial partnerships across global energy markets.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#071A2D] text-slate-50">{children}</body>
    </html>
  );
}
