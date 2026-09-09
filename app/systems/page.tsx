import type { Metadata } from 'next';
import Portfolio from '@/components/portfolio';
import { ogImage } from '@/lib/site';

const description =
  'Interactive real-time WebGL/Three.js visual systems across multi-agent coordination, vector retrieval, and computational neural flows.';

export const metadata: Metadata = {
  title: '3D Architecture Suite',
  description,
  alternates: { canonical: '/systems' },
  openGraph: { title: '3D Architecture Suite — Kamalakar Reddy Gorantla', description, url: '/systems', images: [ogImage] },
  twitter: { card: 'summary_large_image', title: '3D Architecture Suite — Kamalakar Reddy Gorantla', description, images: [ogImage.url] },
};

export default function SystemsPage() {
  return <Portfolio initialView="systems" />;
}
