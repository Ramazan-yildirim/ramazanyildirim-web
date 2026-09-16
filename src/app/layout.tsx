import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Outfit, Space_Grotesk } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-tech",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ramazan Yıldırım",
  description:
    "Computer Engineer — Artificial Intelligence, Software and Intelligent Systems",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html lang="tr" className={`${outfit.variable} ${spaceGrotesk.variable}`}>
      <body className={outfit.className}>{children}</body>
    </html>
  );
}