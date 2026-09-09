import type { Metadata } from 'next';
import Portfolio from '@/components/portfolio';
import { ogImage } from '@/lib/site';

const description =
  'Kamalakar Reddy Gorantla is an AI systems engineer in Bengaluru specializing in multi-agent architectures, agentic retrieval systems, and production full-stack engineering.';

export const metadata: Metadata = {
  title: 'About',
  description,
  alternates: { canonical: '/about' },
  openGraph: { title: 'About — Kamalakar Reddy Gorantla', description, url: '/about', images: [ogImage] },
  twitter: { card: 'summary_large_image', title: 'About — Kamalakar Reddy Gorantla', description, images: [ogImage.url] },
};

export default function About() {
  return <Portfolio initialView="about" />;
}
