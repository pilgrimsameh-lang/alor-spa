/// <reference path="../.astro/types.d.ts" />
/// <reference types="@cloudflare/workers-types" />

type D1Database = import('@cloudflare/workers-types').D1Database;
type R2Bucket = import('@cloudflare/workers-types').R2Bucket;

export interface CloudflareEnv {
  DB: D1Database;
  MEDIA_BUCKET?: R2Bucket;
  SESSION_SECRET: string;
  RATE_LIMIT_SECRET?: string;
  RATE_LIMIT_PREVIOUS_SECRET?: string;
  RATE_LIMIT_KEY_VERSION?: string;
  TRUSTED_PROXIES?: string;
  STORAGE_DRIVER?: string;
  NODE_ENV?: string;
  SITE_URL?: string;
  PUBLIC_SITE_URL?: string;
}

declare namespace App {
  interface Locals {
    runtime?: import('@astrojs/cloudflare').Runtime<CloudflareEnv>;
    db?: import('drizzle-orm/d1').DrizzleD1Database<typeof import('./server/db/schema')>;
    dbClient?: import('./server/db/index').DatabaseClient;
    config?: import('./server/config').ServerConfig;
    user?: {
      id: string;
      username: string;
      email: string;
      fullName: string;
      roleId: string;
      roleSlug: string;
      permissions: string[];
      securityGeneration: number;
    } | null;
    session?: {
      id: string;
      userId: string;
      securityGeneration: number;
      createdAt: number;
      lastActivityAt: number;
      expiresAt: number;
    } | null;
  }
}
