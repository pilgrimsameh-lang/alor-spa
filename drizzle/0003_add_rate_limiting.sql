-- ============================================================================
-- ALOR SPA — Migration 0003: Rate Limiting, Reservations & Session Hardening
-- ============================================================================

CREATE TABLE `rate_limit_records` (
	`key` text PRIMARY KEY NOT NULL,
	`key_version` integer DEFAULT 1 NOT NULL,
	`failures` integer DEFAULT 0 NOT NULL,
	`first_failure_at` integer,
	`blocked_until` integer,
	`generation` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "chk_rate_limit_failures" CHECK("rate_limit_records"."failures" >= 0),
	CONSTRAINT "chk_rate_limit_gen" CHECK("rate_limit_records"."generation" >= 1 AND "rate_limit_records"."generation" <= 9000000000000000),
	CONSTRAINT "chk_rate_limit_version" CHECK("rate_limit_records"."key_version" >= 1)
);
--> statement-breakpoint
CREATE INDEX `idx_rate_limit_blocked` ON `rate_limit_records` (`blocked_until`);
--> statement-breakpoint
CREATE INDEX `idx_rate_limit_first_failure` ON `rate_limit_records` (`first_failure_at`);
--> statement-breakpoint
CREATE INDEX `idx_rate_limit_version` ON `rate_limit_records` (`key_version`);
--> statement-breakpoint
CREATE TABLE `rate_limit_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`account_id` text,
	`snapshot_ip_generation` integer NOT NULL,
	`snapshot_account_generation` integer,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` integer NOT NULL,
	`lease_expires_at` integer NOT NULL,
	`hard_timeout_at` integer NOT NULL,
	FOREIGN KEY (`key`) REFERENCES `rate_limit_records`(`key`) ON UPDATE CASCADE ON DELETE RESTRICT,
	FOREIGN KEY (`account_id`) REFERENCES `admin_users`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT "chk_reservations_status" CHECK("rate_limit_reservations"."status" = 'ACTIVE'),
	CONSTRAINT "chk_reservations_ip_gen" CHECK("rate_limit_reservations"."snapshot_ip_generation" >= 1),
	CONSTRAINT "chk_reservations_acc_gen" CHECK("rate_limit_reservations"."snapshot_account_generation" IS NULL OR "rate_limit_reservations"."snapshot_account_generation" >= 1),
	CONSTRAINT "chk_reservations_times" CHECK("rate_limit_reservations"."hard_timeout_at" >= "rate_limit_reservations"."lease_expires_at" AND "rate_limit_reservations"."lease_expires_at" >= "rate_limit_reservations"."created_at")
);
--> statement-breakpoint
CREATE INDEX `idx_reservations_key` ON `rate_limit_reservations` (`key`);
--> statement-breakpoint
CREATE INDEX `idx_reservations_lease` ON `rate_limit_reservations` (`key`, `lease_expires_at`, `status`);
--> statement-breakpoint
CREATE INDEX `idx_reservations_hard` ON `rate_limit_reservations` (`hard_timeout_at`);
--> statement-breakpoint
ALTER TABLE `admin_users` ADD `security_generation` integer DEFAULT 1 NOT NULL CHECK (`security_generation` >= 1);
--> statement-breakpoint
ALTER TABLE `admin_users` ADD `login_generation` integer DEFAULT 1 NOT NULL CHECK (`login_generation` >= 1);
--> statement-breakpoint
ALTER TABLE `admin_sessions` ADD `security_generation` integer DEFAULT 1 NOT NULL CHECK (`security_generation` >= 1);
--> statement-breakpoint
CREATE INDEX `idx_admin_sessions_user_sec` ON `admin_sessions` (`user_id`, `security_generation`);
