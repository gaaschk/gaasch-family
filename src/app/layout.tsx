import type { Metadata } from 'next';
import ReportIssueButton from '@/components/ReportIssueButton';
import './globals.css';

export const metadata: Metadata = {
  title: 'Heirloom',
  description: 'Build your family tree, discover European citizenship eligibility, and tell your ancestry story.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>
        {children}
        <ReportIssueButton />
      </body>
    </html>
  );
}
