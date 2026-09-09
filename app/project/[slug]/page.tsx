import type { Metadata } from 'next';
import Portfolio from '@/components/portfolio';
import { projects } from '@/lib/portfolio-data';
import { ogImage } from '@/lib/site';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return projects.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find(p => p.slug === slug);
  if (!project) return { title: 'Project not found' };
  const title = `${project.name} — Kamalakar Reddy Gorantla`;
  const url = `/project/${project.slug}`;
  return {
    title: project.name,
    description: project.summary,
    keywords: project.stack,
    alternates: { canonical: url },
    openGraph: { type: 'article', title, description: project.summary, url, images: [ogImage] },
    twitter: { card: 'summary_large_image', title, description: project.summary, images: [ogImage.url] },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!projects.some(p => p.slug === slug)) notFound();
  return <Portfolio initialView="project" initialProject={slug} />;
}
