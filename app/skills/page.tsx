import type { Metadata } from 'next';
import Portfolio from '@/components/portfolio';
import { ogImage } from '@/lib/site';

const description =
  'Capabilities, agentic AI frameworks, production engineering stack, and technical ecosystem of Kamalakar Reddy Gorantla.';

export const metadata: Metadata = {
  title: 'Skills & Capabilities',
  description,
  alternates: { canonical: '/skills' },
  openGraph: { title: 'Skills — Kamalakar Reddy Gorantla', description, url: '/skills', images: [ogImage] },
  twitter: { card: 'summary_large_image', title: 'Skills — Kamalakar Reddy Gorantla', description, images: [ogImage.url] },
};

export default function SkillsPage() {
  return <Portfolio initialView="skills" />;
}
