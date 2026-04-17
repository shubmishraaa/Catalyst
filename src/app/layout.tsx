
import './globals.css';
import {Toaster} from '@/components/ui/toaster';

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Catalyst | Scan & Go Retail',
  description: 'Self-checkout system for modern supermarkets.',
};

export const viewport: Viewport = {
  themeColor: '#14B8A6',
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-body antialiased">
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