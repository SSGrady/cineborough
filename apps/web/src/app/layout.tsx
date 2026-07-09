import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cineborough",
  description: "Hope-core real estate spatial discovery for the DC metro",
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
