import type { Metadata } from 'next';
import Portfolio from '@/components/portfolio';
import { ogImage } from '@/lib/site';

const description =
  'Contact Kamalakar Reddy Gorantla — AI Systems Engineer & Architect based in Bengaluru, India.';

export const metadata: Metadata = {
  title: 'Contact',
  description,
  alternates: { canonical: '/contact' },
  openGraph: { title: 'Contact — Kamalakar Reddy Gorantla', description, url: '/contact', images: [ogImage] },
  twitter: { card: 'summary_large_image', title: 'Contact — Kamalakar Reddy Gorantla', description, images: [ogImage.url] },
};

export default function ContactPage() {
  return <Portfolio initialView="contact" />;
}
