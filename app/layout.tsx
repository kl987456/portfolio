import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google';
import { ogImage, siteDescription, siteName, siteUrl } from '@/lib/site';
import './globals.css';

const instrumentSerif = Instrument_Serif({
  variable: '--font-serif',
  weight: '400',
  subsets: ['latin'],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Kamalakar Reddy Gorantla — AI Engineer',
    template: '%s — Kamalakar Reddy Gorantla',
  },
  description: siteDescription,
  applicationName: siteName,
  authors: [{ name: 'Kamalakar Reddy Gorantla' }],
  creator: 'Kamalakar Reddy Gorantla',
  keywords: [
    'AI engineer',
    'multi-agent systems',
    'RAG',
    'LangGraph',
    'FastAPI',
    'full-stack developer',
    'Bengaluru',
  ],
  icons: { icon: '/favicon.svg' },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName,
    locale: 'en_IN',
    url: '/',
    title: 'Kamalakar Reddy Gorantla — AI Engineer',
    description: siteDescription,
    images: [ogImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kamalakar Reddy Gorantla — AI Engineer',
    description: siteDescription,
    images: [ogImage.url],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#04060d',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakartaSans.variable} ${instrumentSerif.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
