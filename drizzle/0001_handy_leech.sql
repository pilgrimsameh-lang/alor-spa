PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_offers` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`image_id` text,
	`badge_ar` text,
	`badge_en` text,
	`title_ar` text NOT NULL,
	`title_en` text NOT NULL,
	`subtitle_ar` text NOT NULL,
	`subtitle_en` text NOT NULL,
	`description_ar` text NOT NULL,
	`description_en` text NOT NULL,
	`includes_ar` text NOT NULL,
	`includes_en` text NOT NULL,
	`price_amount_halalas` integer,
	`price_currency` text DEFAULT 'SAR' NOT NULL,
	`price_is_confirmed` integer DEFAULT 0 NOT NULL,
	`price_display_ar` text DEFAULT 'الأسعار عند الاستفسار' NOT NULL,
	`price_display_en` text DEFAULT 'Price on inquiry' NOT NULL,
	`duration_minutes` integer,
	`duration_is_confirmed` integer DEFAULT 0 NOT NULL,
	`duration_display_ar` text DEFAULT 'تحدد عند الحجز' NOT NULL,
	`duration_display_en` text DEFAULT 'Confirmed upon booking' NOT NULL,
	`starts_at` integer,
	`expires_at` integer,
	`is_featured` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 0 NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`image_id`) REFERENCES `media_files`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_offers_price_positive" CHECK("__new_offers"."price_amount_halalas" IS NULL OR "__new_offers"."price_amount_halalas" >= 0),
	CONSTRAINT "chk_offers_duration_positive" CHECK("__new_offers"."duration_minutes" IS NULL OR "__new_offers"."duration_minutes" > 0),
	CONSTRAINT "chk_offers_price_confirmed" CHECK("__new_offers"."price_is_confirmed" = 0 OR "__new_offers"."price_amount_halalas" IS NOT NULL),
	CONSTRAINT "chk_offers_duration_confirmed" CHECK("__new_offers"."duration_is_confirmed" = 0 OR "__new_offers"."duration_minutes" IS NOT NULL)
);
--> statement-breakpoint
INSERT INTO `__new_offers`("id", "slug", "image_id", "badge_ar", "badge_en", "title_ar", "title_en", "subtitle_ar", "subtitle_en", "description_ar", "description_en", "includes_ar", "includes_en", "price_amount_halalas", "price_currency", "price_is_confirmed", "price_display_ar", "price_display_en", "duration_minutes", "duration_is_confirmed", "duration_display_ar", "duration_display_en", "starts_at", "expires_at", "is_featured", "is_active", "display_order", "created_at", "updated_at") SELECT "id", "slug", "image_id", "badge_ar", "badge_en", "title_ar", "title_en", "subtitle_ar", "subtitle_en", "description_ar", "description_en", "includes_ar", "includes_en", "price_amount_halalas", "price_currency", "price_is_confirmed", "price_display_ar", "price_display_en", "duration_minutes", "duration_is_confirmed", "duration_display_ar", "duration_display_en", "starts_at", "expires_at", "is_featured", "is_active", "display_order", "created_at", "updated_at" FROM `offers`;--> statement-breakpoint
DROP TABLE `offers`;--> statement-breakpoint
ALTER TABLE `__new_offers` RENAME TO `offers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `offers_slug_unique` ON `offers` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_offers_active` ON `offers` (`is_active`,`display_order`);--> statement-breakpoint
CREATE TABLE `__new_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text,
	`author_name` text NOT NULL,
	`author_title_ar` text,
	`author_title_en` text,
	`quote_ar` text NOT NULL,
	`quote_en` text NOT NULL,
	`rating` integer DEFAULT 5 NOT NULL,
	`is_verified` integer DEFAULT 0 NOT NULL,
	`is_approved` integer DEFAULT 0 NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`review_date` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_reviews_rating_range" CHECK("__new_reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
INSERT INTO `__new_reviews`("id", "service_id", "author_name", "author_title_ar", "author_title_en", "quote_ar", "quote_en", "rating", "is_verified", "is_approved", "display_order", "review_date", "created_at", "updated_at") SELECT "id", "service_id", "author_name", "author_title_ar", "author_title_en", "quote_ar", "quote_en", "rating", "is_verified", "is_approved", "display_order", "review_date", "created_at", "updated_at" FROM `reviews`;--> statement-breakpoint
DROP TABLE `reviews`;--> statement-breakpoint
ALTER TABLE `__new_reviews` RENAME TO `reviews`;--> statement-breakpoint
CREATE INDEX `idx_reviews_approved` ON `reviews` (`is_approved`,`display_order`);--> statement-breakpoint
CREATE TABLE `__new_services` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`featured_image_id` text,
	`slug` text NOT NULL,
	`title_ar` text NOT NULL,
	`title_en` text NOT NULL,
	`subtitle_ar` text NOT NULL,
	`subtitle_en` text NOT NULL,
	`description_ar` text NOT NULL,
	`description_en` text NOT NULL,
	`detailed_description_ar` text NOT NULL,
	`detailed_description_en` text NOT NULL,
	`is_signature` integer DEFAULT 0 NOT NULL,
	`is_published` integer DEFAULT 1 NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`price_amount_halalas` integer,
	`price_currency` text DEFAULT 'SAR' NOT NULL,
	`price_is_confirmed` integer DEFAULT 0 NOT NULL,
	`price_display_ar` text DEFAULT 'الأسعار عند الاستفسار' NOT NULL,
	`price_display_en` text DEFAULT 'Price on inquiry' NOT NULL,
	`price_note_ar` text,
	`price_note_en` text,
	`duration_minutes` integer,
	`duration_is_confirmed` integer DEFAULT 0 NOT NULL,
	`duration_display_ar` text DEFAULT 'تحدد عند الحجز' NOT NULL,
	`duration_display_en` text DEFAULT 'Confirmed upon booking' NOT NULL,
	`duration_note_ar` text,
	`duration_note_en` text,
	`features_ar` text NOT NULL,
	`features_en` text NOT NULL,
	`benefits_ar` text NOT NULL,
	`benefits_en` text NOT NULL,
	`steps_ar` text NOT NULL,
	`steps_en` text NOT NULL,
	`includes_ar` text NOT NULL,
	`includes_en` text NOT NULL,
	`suitability_ar` text NOT NULL,
	`suitability_en` text NOT NULL,
	`advisory_ar` text NOT NULL,
	`advisory_en` text NOT NULL,
	`seo_title_ar` text NOT NULL,
	`seo_title_en` text NOT NULL,
	`seo_description_ar` text NOT NULL,
	`seo_description_en` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `service_categories`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`featured_image_id`) REFERENCES `media_files`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_services_price_positive" CHECK("__new_services"."price_amount_halalas" IS NULL OR "__new_services"."price_amount_halalas" >= 0),
	CONSTRAINT "chk_services_duration_positive" CHECK("__new_services"."duration_minutes" IS NULL OR "__new_services"."duration_minutes" > 0),
	CONSTRAINT "chk_services_price_confirmed" CHECK("__new_services"."price_is_confirmed" = 0 OR "__new_services"."price_amount_halalas" IS NOT NULL),
	CONSTRAINT "chk_services_duration_confirmed" CHECK("__new_services"."duration_is_confirmed" = 0 OR "__new_services"."duration_minutes" IS NOT NULL)
);
--> statement-breakpoint
INSERT INTO `__new_services`("id", "category_id", "featured_image_id", "slug", "title_ar", "title_en", "subtitle_ar", "subtitle_en", "description_ar", "description_en", "detailed_description_ar", "detailed_description_en", "is_signature", "is_published", "display_order", "price_amount_halalas", "price_currency", "price_is_confirmed", "price_display_ar", "price_display_en", "price_note_ar", "price_note_en", "duration_minutes", "duration_is_confirmed", "duration_display_ar", "duration_display_en", "duration_note_ar", "duration_note_en", "features_ar", "features_en", "benefits_ar", "benefits_en", "steps_ar", "steps_en", "includes_ar", "includes_en", "suitability_ar", "suitability_en", "advisory_ar", "advisory_en", "seo_title_ar", "seo_title_en", "seo_description_ar", "seo_description_en", "created_at", "updated_at") SELECT "id", "category_id", "featured_image_id", "slug", "title_ar", "title_en", "subtitle_ar", "subtitle_en", "description_ar", "description_en", "detailed_description_ar", "detailed_description_en", "is_signature", "is_published", "display_order", "price_amount_halalas", "price_currency", "price_is_confirmed", "price_display_ar", "price_display_en", "price_note_ar", "price_note_en", "duration_minutes", "duration_is_confirmed", "duration_display_ar", "duration_display_en", "duration_note_ar", "duration_note_en", "features_ar", "features_en", "benefits_ar", "benefits_en", "steps_ar", "steps_en", "includes_ar", "includes_en", "suitability_ar", "suitability_en", "advisory_ar", "advisory_en", "seo_title_ar", "seo_title_en", "seo_description_ar", "seo_description_en", "created_at", "updated_at" FROM `services`;--> statement-breakpoint
DROP TABLE `services`;--> statement-breakpoint
ALTER TABLE `__new_services` RENAME TO `services`;--> statement-breakpoint
CREATE UNIQUE INDEX `services_slug_unique` ON `services` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_services_slug` ON `services` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_services_category_id` ON `services` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_services_published_order` ON `services` (`is_published`,`display_order`);