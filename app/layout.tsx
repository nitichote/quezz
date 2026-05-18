import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quezz Live",
  description: "A lightweight live quiz app for seminars.",
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
