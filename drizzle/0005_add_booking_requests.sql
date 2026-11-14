-- ============================================================================
-- ALOR SPA — Migration 0005: Booking Requests & Client Inquiries
-- ============================================================================

CREATE TABLE `booking_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`request_number` text NOT NULL,
	`client_name` text NOT NULL,
	`client_phone` text NOT NULL,
	`service_id` text,
	`service_name` text NOT NULL,
	`preferred_date` text NOT NULL,
	`preferred_time` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'new' NOT NULL,
	`admin_notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE NO ACTION ON DELETE SET NULL,
	CONSTRAINT "chk_booking_requests_status" CHECK("booking_requests"."status" IN ('new', 'following_up', 'contacted', 'confirmed', 'cancelled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_requests_request_number_unique` ON `booking_requests` (`request_number`);
--> statement-breakpoint
CREATE INDEX `idx_booking_requests_status_created` ON `booking_requests` (`status`, `created_at`);
--> statement-breakpoint
CREATE INDEX `idx_booking_requests_date` ON `booking_requests` (`preferred_date`);
--> statement-breakpoint
CREATE INDEX `idx_booking_requests_phone` ON `booking_requests` (`client_phone`);
