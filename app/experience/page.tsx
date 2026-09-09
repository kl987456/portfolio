import type { Metadata } from 'next';
import Portfolio from '@/components/portfolio';
import { ogImage } from '@/lib/site';

const description =
  'Production engineering telemetry, systems architecture, and backend experience of Kamalakar Reddy Gorantla at Terralogic and WhatBytes.';

export const metadata: Metadata = {
  title: 'Experience',
  description,
  alternates: { canonical: '/experience' },
  openGraph: { title: 'Experience — Kamalakar Reddy Gorantla', description, url: '/experience', images: [ogImage] },
  twitter: { card: 'summary_large_image', title: 'Experience — Kamalakar Reddy Gorantla', description, images: [ogImage.url] },
};

export default function ExperiencePage() {
  return <Portfolio initialView="experience" />;
}
