import type { Metadata } from 'next';
import Portfolio from '@/components/portfolio';
import { ogImage } from '@/lib/site';

const description =
  'Real-time WebGL graphics, procedural 3D simulations, and engineering project archives.';

export const metadata: Metadata = {
  title: 'Playground',
  description,
  alternates: { canonical: '/playground' },
  openGraph: { title: 'Playground — Kamalakar Reddy Gorantla', description, url: '/playground', images: [ogImage] },
  twitter: { card: 'summary_large_image', title: 'Playground — Kamalakar Reddy Gorantla', description, images: [ogImage.url] },
};

export default function Playground() {
  return <Portfolio initialView="playground" />;
}
