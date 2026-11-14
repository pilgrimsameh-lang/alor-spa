PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_admin_users` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`failed_login_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`last_login_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `admin_roles`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_admin_users_failed_attempts" CHECK("__new_admin_users"."failed_login_attempts" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_admin_users`("id", "role_id", "username", "email", "password_hash", "full_name", "is_active", "failed_login_attempts", "locked_until", "last_login_at", "created_at", "updated_at") SELECT "id", "role_id", "username", "email", "password_hash", "full_name", "is_active", 0, NULL, "last_login_at", "created_at", "updated_at" FROM `admin_users`;--> statement-breakpoint
DROP TABLE `admin_users`;--> statement-breakpoint
ALTER TABLE `__new_admin_users` RENAME TO `admin_users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_username_unique` ON `admin_users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_email_unique` ON `admin_users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_admin_users_username` ON `admin_users` (`username`);--> statement-breakpoint
CREATE INDEX `idx_admin_users_email` ON `admin_users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_admin_users_role_id` ON `admin_users` (`role_id`);