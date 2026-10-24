import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { AppShell } from '../components/layout/AppShell';
import './globals.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = DM_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'ONBOARD: Your All-in-Uni Companion', template: '%s | ONBOARD' },
  description: 'Discover people, buy, sell and rent on campus, and find campus information. Starting with KIET Group of Institutions, Ghaziabad.',
  applicationName: 'ONBOARD',
  // Development preview: keep out of search engines. Remove this line at launch (Milestone 9).
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2391FF',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
