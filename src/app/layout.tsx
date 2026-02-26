import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Gaasch Family — A History Across Nine Generations',
  description: 'Tracing the direct Gaasch paternal line from Jean Gaasch (c. 1698, Alzingen, Luxembourg) through nine generations to the Texas High Plains.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
