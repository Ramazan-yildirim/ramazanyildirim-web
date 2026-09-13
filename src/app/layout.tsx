import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ramazan Yıldırım",
  description:
    "Computer Engineer — Artificial Intelligence, Software and Intelligent Systems",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}