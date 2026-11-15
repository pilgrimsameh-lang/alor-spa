import type { APIRoute } from 'astro';
import { getSiteUrl } from '../config/site';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const siteUrl = site?.toString().replace(/\/$/, '') || getSiteUrl();

  const robots = `# ALOR SPA — robots.txt
# Official Web Robots Directives for Search Engines

User-agent: *
Allow: /
Allow: /images/
Allow: /favicon.ico
Allow: /favicon.svg

# Disallow Private Administrative & API Areas
Disallow: /admin
Disallow: /admin/
Disallow: /api/
Disallow: /api/admin/

# Sitemap Location
Sitemap: ${siteUrl}/sitemap.xml
Sitemap: https://alorspa.com/sitemap.xml
`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
