import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { MedicationProvider } from '@/context/medication-context';
import { RootHeader } from '@/components/root-header';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'PillPal',
  description: 'Your daily medication tracker.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/sign-in">
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet" />
        </head>
        <body className={cn('font-body antialiased', 'min-h-screen bg-background font-sans')}>
          <RootHeader />
          <MedicationProvider>
            {children}
            <Toaster />
          </MedicationProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
