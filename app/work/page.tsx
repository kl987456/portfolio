import type { Metadata } from 'next';
import Portfolio from '@/components/portfolio';
import { ogImage } from '@/lib/site';

const description =
  'Flagship multi-agent systems and production AI architectures built by Kamalakar Reddy Gorantla.';

export const metadata: Metadata = {
  title: 'Work & Systems',
  description,
  alternates: { canonical: '/work' },
  openGraph: { title: 'Work — Kamalakar Reddy Gorantla', description, url: '/work', images: [ogImage] },
  twitter: { card: 'summary_large_image', title: 'Work — Kamalakar Reddy Gorantla', description, images: [ogImage.url] },
};

export default function WorkPage() {
  return <Portfolio initialView="systems" />;
}
