CREATE TABLE `device` (
	`id` text PRIMARY KEY,
	`public_key` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`platform` text NOT NULL,
	`server_device` integer DEFAULT false NOT NULL,
	`paired_at` integer NOT NULL,
	`last_seen_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `device_one_server_device` ON `device` (`server_device`) WHERE "device"."server_device" = 1;