import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/context/StoreContext';
import { ThemeProvider } from '@/context/ThemeContext';
import Header from '@/components/Header';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'OmniPOS | Enterprise Multi-Store POS & Kiosk Platform',
  description:
    'Modern, multi-tenant, role-based Point of Sale, Barcode Scanner, Self-Checkout Kiosk, and Kitchen Display System.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('omnipos_theme');
                if (t === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 selection:bg-orange-500 selection:text-white font-sans transition-colors duration-150">
        <ThemeProvider>
          <StoreProvider>
            <Header />
            <div className="flex-1 flex flex-col">{children}</div>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
