// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Smart Link Admin',
  description: 'Admin dashboard for Smart Link Generator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head />
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
