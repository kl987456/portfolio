import type { MetadataRoute } from 'next';
import { projects } from '@/lib/portfolio-data';
import { siteUrl } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${siteUrl}/`, lastModified, changeFrequency: 'monthly', priority: 1 },
    { url: `${siteUrl}/about`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${siteUrl}/playground`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    ...projects.map(p => ({
      url: `${siteUrl}/project/${p.slug}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
