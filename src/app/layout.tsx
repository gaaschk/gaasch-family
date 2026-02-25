import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gaasch Family History',
  description: 'Ten generations of the Gaasch paternal line — from Alzingen, Luxembourg (c. 1698) to the present.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
