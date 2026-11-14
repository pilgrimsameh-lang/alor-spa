/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
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
