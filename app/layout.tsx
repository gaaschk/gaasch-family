import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Heirloom — Your Family History",
  description:
    "A private family history platform for exploring and preserving your ancestry.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
