// Shared site-level constants for metadata, share cards, and the sitemap.
//
// Set NEXT_PUBLIC_SITE_URL to the production origin (no trailing slash) so
// absolute URLs in Open Graph tags and the sitemap point at the live site.
// Without it these fall back to localhost, which is correct for dev but will
// break social previews in production.
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kamalreddygorantla.online').replace(/\/$/, '');

export const siteName = 'Kamalakar Reddy Gorantla';

export const siteDescription =
  'Kamalakar Reddy Gorantla builds multi-agent systems, RAG pipelines, and full-stack applications. Explore Workforce AI, ForgeGuard, Aperture, ResearchForge, and Atlas.';

export const ogImage = {
  url: '/images/agent-studio.png',
  width: 1536,
  height: 1024,
  alt: 'Kamalakar Reddy Gorantla seated with three imagined humanoid AI companions',
};
