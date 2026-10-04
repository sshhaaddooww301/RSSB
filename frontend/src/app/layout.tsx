import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RSSB Langar JSR',
  description: 'RSSB Langar Jamshedpur — Inventory & Stock Management System.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#c8102e',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f8fafc] text-gray-900 font-sans">
        {children}
      </body>
    </html>
  );
}
