CREATE TABLE `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`old_values` text,
	`new_values` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_activity_logs_created` ON `activity_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_activity_logs_user` ON `activity_logs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_activity_logs_entity` ON `activity_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `admin_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name_ar` text NOT NULL,
	`name_en` text NOT NULL,
	`description` text,
	`permissions` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_roles_slug_unique` ON `admin_roles` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_admin_roles_slug` ON `admin_roles` (`slug`);--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`last_activity_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_sessions_token_hash_unique` ON `admin_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_admin_sessions_token_hash` ON `admin_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_admin_sessions_user_id` ON `admin_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_admin_sessions_expires_at` ON `admin_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`last_login_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `admin_roles`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_username_unique` ON `admin_users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_email_unique` ON `admin_users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_admin_users_username` ON `admin_users` (`username`);--> statement-breakpoint
CREATE INDEX `idx_admin_users_email` ON `admin_users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_admin_users_role_id` ON `admin_users` (`role_id`);--> statement-breakpoint
CREATE TABLE `blog_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`featured_image_id` text,
	`title_ar` text NOT NULL,
	`title_en` text NOT NULL,
	`excerpt_ar` text NOT NULL,
	`excerpt_en` text NOT NULL,
	`content_ar` text NOT NULL,
	`content_en` text NOT NULL,
	`author_name` text DEFAULT 'ALOR SPA' NOT NULL,
	`is_published` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`seo_title_ar` text,
	`seo_title_en` text,
	`seo_desc_ar` text,
	`seo_desc_en` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`featured_image_id`) REFERENCES `media_files`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blog_posts_slug_unique` ON `blog_posts` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_blog_posts_slug` ON `blog_posts` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_blog_posts_published` ON `blog_posts` (`is_published`,`published_at`);--> statement-breakpoint
CREATE TABLE `gallery_items` (
	`id` text PRIMARY KEY NOT NULL,
	`media_id` text NOT NULL,
	`category` text NOT NULL,
	`category_label_ar` text NOT NULL,
	`category_label_en` text NOT NULL,
	`title_ar` text NOT NULL,
	`title_en` text NOT NULL,
	`alt_ar` text NOT NULL,
	`alt_en` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_published` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media_files`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_gallery_category` ON `gallery_items` (`category`,`display_order`);--> statement-breakpoint
CREATE TABLE `media_files` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`width` integer,
	`height` integer,
	`storage_path` text NOT NULL,
	`public_url` text NOT NULL,
	`alt_ar` text DEFAULT '' NOT NULL,
	`alt_en` text DEFAULT '' NOT NULL,
	`title_ar` text,
	`title_en` text,
	`uploaded_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`uploaded_by`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_media_files_created` ON `media_files` (`created_at`);--> statement-breakpoint
CREATE TABLE `offers` (
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
	FOREIGN KEY (`image_id`) REFERENCES `media_files`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `offers_slug_unique` ON `offers` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_offers_active` ON `offers` (`is_active`,`display_order`);--> statement-breakpoint
CREATE TABLE `reviews` (
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
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_approved` ON `reviews` (`is_approved`,`display_order`);--> statement-breakpoint
CREATE TABLE `service_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title_ar` text NOT NULL,
	`title_en` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_categories_slug_unique` ON `service_categories` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_service_categories_slug` ON `service_categories` (`slug`);--> statement-breakpoint
CREATE TABLE `services` (
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
	FOREIGN KEY (`featured_image_id`) REFERENCES `media_files`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `services_slug_unique` ON `services` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_services_slug` ON `services` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_services_category_id` ON `services` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_services_published_order` ON `services` (`is_published`,`display_order`);--> statement-breakpoint
CREATE TABLE `site_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_ar` text DEFAULT '' NOT NULL,
	`value_en` text DEFAULT '' NOT NULL,
	`value_raw` text,
	`group_name` text NOT NULL,
	`data_type` text DEFAULT 'string' NOT NULL,
	`is_public` integer DEFAULT 1 NOT NULL,
	`is_immutable` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_site_settings_group` ON `site_settings` (`group_name`,`is_public`);