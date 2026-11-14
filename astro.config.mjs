// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
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
  adapter: node({
    mode: 'standalone',
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
