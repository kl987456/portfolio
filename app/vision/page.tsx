import type { Metadata } from 'next';
import Portfolio from '@/components/portfolio';
import { ogImage } from '@/lib/site';

const description =
  'Autonomous multi-agent system vision and human-in-the-loop engineering by Kamalakar Reddy Gorantla.';

export const metadata: Metadata = {
  title: 'Vision — Kamalakar Reddy Gorantla',
  description,
  alternates: { canonical: '/vision' },
  openGraph: { title: 'Vision — Kamalakar Reddy Gorantla', description, url: '/vision', images: [ogImage] },
  twitter: { card: 'summary_large_image', title: 'Vision — Kamalakar Reddy Gorantla', description, images: [ogImage.url] },
};

export default function VisionPage() {
  return <Portfolio initialView="vision" />;
}
