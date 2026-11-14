import { z } from 'astro/zod';

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
  STORAGE_DRIVER: z.enum(['local', 'r2', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('./data/uploads'),
});

export type ServerConfig = z.infer<typeof serverConfigSchema>;

let cachedConfig: ServerConfig | null = null;

/**
 * Validates and retrieves server-side configuration.
 * Can take optional runtime env bindings (e.g. from Cloudflare runtime.env) or read process.env.
 * Throws a fatal, human-readable error if required secrets are missing or insecure.
 */
export function getServerConfig(runtimeEnv?: Record<string, unknown>): ServerConfig {
  const getEnv = (key: string): string | undefined => {
    if (runtimeEnv && runtimeEnv[key] !== undefined) {
      return String(runtimeEnv[key]);
    }
    if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
      return process.env[key];
    }
    return undefined;
  };

  const rawSessionSecret = getEnv('SESSION_SECRET') || '';
  const rawRateLimitSecret = getEnv('RATE_LIMIT_SECRET') || rawSessionSecret;

  const rawConfig = {
    NODE_ENV: getEnv('NODE_ENV') || 'development',
    HOST: getEnv('HOST') || 'localhost',
    PORT: getEnv('PORT') ? Number(getEnv('PORT')) : 4321,
    SESSION_SECRET: rawSessionSecret,
    RATE_LIMIT_SECRET: rawRateLimitSecret,
    RATE_LIMIT_PREVIOUS_SECRET: getEnv('RATE_LIMIT_PREVIOUS_SECRET') || undefined,
    RATE_LIMIT_KEY_VERSION: getEnv('RATE_LIMIT_KEY_VERSION') ? Number(getEnv('RATE_LIMIT_KEY_VERSION')) : 1,
    TRUSTED_PROXIES: getEnv('TRUSTED_PROXIES') || '127.0.0.1,::1',
    DB_PATH: getEnv('DB_PATH') || './data/alor_spa.db',
    STORAGE_DRIVER: (getEnv('STORAGE_DRIVER') as any) || 'local',
    UPLOAD_DIR: getEnv('UPLOAD_DIR') || './data/uploads',
  };

  const isBuild = typeof process !== 'undefined' && (process.env?.npm_lifecycle_event === 'build' || process.env?.ASTRO_BUILD === 'true');

  const result = serverConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    // If during `astro build` pre-rendering and SESSION_SECRET is not yet provided,
    // allow static assets to compile cleanly while warning that runtime will strictly require it.
    if (!rawConfig.SESSION_SECRET || isBuild) {
      cachedConfig = {
        NODE_ENV: 'production',
        HOST: 'localhost',
        PORT: 4321,
        SESSION_SECRET: rawConfig.SESSION_SECRET || 'BUILD_TIME_PLACEHOLDER_NOT_FOR_RUNTIME_32_CHARS',
        RATE_LIMIT_SECRET: rawConfig.RATE_LIMIT_SECRET || 'BUILD_TIME_PLACEHOLDER_NOT_FOR_RUNTIME_32_CHARS',
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
      `\n=======================================================\n`;

    throw new Error(errorMessage);
  }

  cachedConfig = result.data;
  return cachedConfig;
}
