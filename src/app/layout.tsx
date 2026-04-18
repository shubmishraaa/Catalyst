
import './globals.css';
import {Toaster} from '@/components/ui/toaster';

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Catalyst | Scan & Go Retail',
  description: 'Self-checkout system for modern supermarkets.',
};

export const viewport: Viewport = {
  themeColor: '#0A0F1E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

import { AuthProvider } from "@/lib/contexts/AuthContext";
import { SessionProvider } from "@/lib/contexts/SessionContext";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            <SessionProvider>
              {children}
            </SessionProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
