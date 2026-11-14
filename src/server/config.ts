import fs from 'node:fs';
import path from 'node:path';
import { z } from 'astro/zod';

/**
 * Loads .env.local and .env files into process.env if variables are not already set.
 * This ensures that standalone Node execution (e.g. `node ./dist/server/entry.mjs`)
 * seamlessly picks up local configuration without external dependencies.
 */
function loadLocalEnvFiles(): void {
  const cwd = process.cwd();
  const envFiles = ['.env.local', '.env'];

  for (const filename of envFiles) {
    const fullPath = path.resolve(cwd, filename);
    if (fs.existsSync(fullPath)) {
      try {
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        for (const line of fileContent.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if (
              (val.startsWith('"') && val.endsWith('"')) ||
              (val.startsWith("'") && val.endsWith("'"))
            ) {
              val = val.slice(1, -1);
            }
            if (process.env[key] === undefined) {
              process.env[key] = val;
            }
          }
        }
      } catch {
        // Silently continue if an environment file cannot be read
      }
    }
  }
}

// Automatically load local env files before parsing
loadLocalEnvFiles();

/**
 * Server Configuration Zod Schema
 * Strict validation of server-only secrets and runtime settings.
 */
export const serverConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('localhost'),
  PORT: z.coerce.number().default(4321),
  SESSION_SECRET: z
    .string({
      required_error: 'SESSION_SECRET is required to secure administrative sessions.',
    })
    .min(32, 'SESSION_SECRET must be at least 32 characters long for cryptographic entropy.'),
  RATE_LIMIT_SECRET: z
    .string()
    .min(32, 'RATE_LIMIT_SECRET must be at least 32 characters long.')
    .optional(),
  RATE_LIMIT_PREVIOUS_SECRET: z
    .string()
    .min(32, 'RATE_LIMIT_PREVIOUS_SECRET must be at least 32 characters long.')
    .optional(),
  RATE_LIMIT_KEY_VERSION: z.coerce.number().int().min(1).default(1),
  TRUSTED_PROXIES: z.string().default('127.0.0.1,::1'),
  DB_PATH: z.string().default('./data/alor_spa.db'),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('./data/uploads'),
});

export type ServerConfig = z.infer<typeof serverConfigSchema>;

let cachedConfig: ServerConfig | null = null;

/**
 * Validates and retrieves server-side configuration.
 * Throws a fatal, human-readable error if required secrets are missing or insecure.
 */
export function getServerConfig(): ServerConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const rawSessionSecret = process.env.SESSION_SECRET || '';
  const rawRateLimitSecret = process.env.RATE_LIMIT_SECRET || rawSessionSecret;

  const rawConfig = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    HOST: process.env.HOST || 'localhost',
    PORT: process.env.PORT || 4321,
    SESSION_SECRET: rawSessionSecret,
    RATE_LIMIT_SECRET: rawRateLimitSecret,
    RATE_LIMIT_PREVIOUS_SECRET: process.env.RATE_LIMIT_PREVIOUS_SECRET || undefined,
    RATE_LIMIT_KEY_VERSION: process.env.RATE_LIMIT_KEY_VERSION || 1,
    TRUSTED_PROXIES: process.env.TRUSTED_PROXIES || '127.0.0.1,::1',
    DB_PATH: process.env.DB_PATH || './data/alor_spa.db',
    STORAGE_DRIVER: process.env.STORAGE_DRIVER || 'local',
    UPLOAD_DIR: process.env.UPLOAD_DIR || './data/uploads',
  };

  const isBuild = process.env.npm_lifecycle_event === 'build';

  const result = serverConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    // If during `astro build` pre-rendering and SESSION_SECRET is not yet provided,
    // allow static assets to compile cleanly while warning that runtime will strictly require it.
    if (isBuild && !rawConfig.SESSION_SECRET) {
      cachedConfig = {
        NODE_ENV: 'production',
        HOST: 'localhost',
        PORT: 4321,
        SESSION_SECRET: 'BUILD_TIME_PLACEHOLDER_NOT_FOR_RUNTIME_32_CHARS',
        RATE_LIMIT_SECRET: 'BUILD_TIME_PLACEHOLDER_NOT_FOR_RUNTIME_32_CHARS',
        RATE_LIMIT_KEY_VERSION: 1,
        TRUSTED_PROXIES: '127.0.0.1,::1',
        DB_PATH: './data/alor_spa.db',
        STORAGE_DRIVER: 'local',
        UPLOAD_DIR: './data/uploads',
      };
      return cachedConfig;
    }

    const issues = result.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`);
    const errorMessage =
      `\n=======================================================\n` +
      `[ALOR SPA] FATAL SERVER CONFIGURATION ERROR\n` +
      `The server cannot start due to missing or invalid environment variables:\n\n` +
      issues.join('\n') +
      `\n\nRemedy:\n` +
      `  1. Create a '.env.local' file in the project root.\n` +
      `  2. Set SESSION_SECRET with a cryptographically secure random string (minimum 32 characters).\n` +
      `  Example:\n` +
      `     SESSION_SECRET=c4a8f93e7b2d1065e8a1d7f4b2c9e3a6f1d8b5c2e9a7f3d1b8c6e4a2f9d7b5c3\n` +
      `=======================================================\n`;

    throw new Error(errorMessage);
  }

  cachedConfig = result.data;
  return cachedConfig;
}
