// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

const siteUrl = process.env.SITE_URL || process.env.PUBLIC_SITE_URL || 'https://alorspa.com';

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  server: {
    host: true,
    port: 4321,
  },
  output: 'static',
  session: false,
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
    prerenderEnvironment: 'node',
    imageService: 'passthrough',
  }),
  i18n: {
    defaultLocale: 'ar',
    locales: ['ar', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
