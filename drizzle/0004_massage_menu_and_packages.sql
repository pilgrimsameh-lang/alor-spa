-- ============================================================================
-- ALOR SPA — Migration 0004: Massage Menu, Service Variants & Packages
-- ============================================================================

CREATE TABLE `massage_types` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`service_id` text,
	`title_ar` text NOT NULL,
	`title_en` text NOT NULL,
	`subtitle_ar` text DEFAULT '' NOT NULL,
	`subtitle_en` text DEFAULT '' NOT NULL,
	`description_ar` text NOT NULL,
	`description_en` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE NO ACTION ON DELETE SET NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `massage_types_slug_unique` ON `massage_types` (`slug`);
--> statement-breakpoint
CREATE INDEX `idx_massage_types_slug` ON `massage_types` (`slug`);
--> statement-breakpoint
CREATE INDEX `idx_massage_types_order` ON `massage_types` (`is_active`, `display_order`);
--> statement-breakpoint
CREATE TABLE `service_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`massage_type_id` text NOT NULL,
	`service_id` text,
	`slug` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`duration_display_ar` text NOT NULL,
	`duration_display_en` text NOT NULL,
	`price_amount_halalas` integer NOT NULL,
	`price_currency` text DEFAULT 'SAR' NOT NULL,
	`price_display_ar` text NOT NULL,
	`price_display_en` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`massage_type_id`) REFERENCES `massage_types`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE NO ACTION ON DELETE SET NULL,
	CONSTRAINT "chk_service_variants_price" CHECK("service_variants"."price_amount_halalas" >= 0),
	CONSTRAINT "chk_service_variants_duration" CHECK("service_variants"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_variants_slug_unique` ON `service_variants` (`slug`);
--> statement-breakpoint
CREATE INDEX `idx_service_variants_massage_type` ON `service_variants` (`massage_type_id`, `display_order`);
--> statement-breakpoint
CREATE INDEX `idx_service_variants_duration` ON `service_variants` (`duration_minutes`);
--> statement-breakpoint
CREATE TABLE `packages` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`package_type` text DEFAULT 'standard' NOT NULL,
	`title_ar` text NOT NULL,
	`title_en` text NOT NULL,
	`subtitle_ar` text DEFAULT '' NOT NULL,
	`subtitle_en` text DEFAULT '' NOT NULL,
	`description_ar` text NOT NULL,
	`description_en` text NOT NULL,
	`includes_ar` text NOT NULL,
	`includes_en` text NOT NULL,
	`price_amount_halalas` integer,
	`price_currency` text DEFAULT 'SAR' NOT NULL,
	`price_display_ar` text NOT NULL,
	`price_display_en` text NOT NULL,
	`badge_ar` text,
	`badge_en` text,
	`image_id` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`image_id`) REFERENCES `media_files`(`id`) ON UPDATE NO ACTION ON DELETE SET NULL,
	CONSTRAINT "chk_packages_price" CHECK("packages"."price_amount_halalas" IS NULL OR "packages"."price_amount_halalas" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `packages_slug_unique` ON `packages` (`slug`);
--> statement-breakpoint
CREATE INDEX `idx_packages_slug` ON `packages` (`slug`);
--> statement-breakpoint
CREATE INDEX `idx_packages_type_order` ON `packages` (`package_type`, `is_active`, `display_order`);
--> statement-breakpoint
CREATE TABLE `package_options` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`slug` text NOT NULL,
	`title_ar` text NOT NULL,
	`title_en` text NOT NULL,
	`description_ar` text,
	`description_en` text,
	`price_amount_halalas` integer NOT NULL,
	`price_currency` text DEFAULT 'SAR' NOT NULL,
	`price_display_ar` text NOT NULL,
	`price_display_en` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
	CONSTRAINT "chk_package_options_price" CHECK("package_options"."price_amount_halalas" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `package_options_slug_unique` ON `package_options` (`slug`);
--> statement-breakpoint
CREATE INDEX `idx_package_options_pkg` ON `package_options` (`package_id`, `display_order`);
