import type { APIRoute } from 'astro';
import { servicesData } from '../data/services';
import { getSiteUrl } from '../config/site';

export const prerender = true;

interface SitemapItem {
  arPath: string;
  enPath: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: string;
}

export const GET: APIRoute = ({ site }) => {
  const siteUrl = site?.toString().replace(/\/$/, '') || getSiteUrl();
  const today = new Date().toISOString().split('T')[0];

  const pages: SitemapItem[] = [
    {
      arPath: '/',
      enPath: '/en/',
      changefreq: 'weekly',
      priority: '1.0',
    },
    {
      arPath: '/services',
      enPath: '/en/services',
      changefreq: 'weekly',
      priority: '0.9',
    },
    {
      arPath: '/offers',
      enPath: '/en/offers',
      changefreq: 'weekly',
      priority: '0.9',
    },
    {
      arPath: '/gallery',
      enPath: '/en/gallery',
      changefreq: 'monthly',
      priority: '0.8',
    },
    {
      arPath: '/testimonials',
      enPath: '/en/testimonials',
      changefreq: 'monthly',
      priority: '0.8',
    },
    ...servicesData.map((s) => ({
      arPath: `/services/${s.slug}`,
      enPath: `/en/services/${s.slug}`,
      changefreq: 'monthly' as const,
      priority: '0.8',
    })),
  ];

  const buildUrlEntry = (loc: string, arUrl: string, enUrl: string, changefreq: string, priority: string) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="${arUrl}" />
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${arUrl}" />
  </url>`;

  const urlEntries: string[] = [];

  for (const page of pages) {
    const arUrl = `${siteUrl}${page.arPath === '/' ? '/' : page.arPath}`;
    const enUrl = `${siteUrl}${page.enPath}`;

    // Arabic Page entry
    urlEntries.push(buildUrlEntry(arUrl, arUrl, enUrl, page.changefreq, page.priority));
    // English Page entry
    urlEntries.push(buildUrlEntry(enUrl, arUrl, enUrl, page.changefreq, page.priority));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
