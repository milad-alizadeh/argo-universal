ALTER TABLE `session` ADD `title` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `session` ADD `title_source` text DEFAULT 'prompt' NOT NULL;--> statement-breakpoint
ALTER TABLE `session` ADD `archived_at` integer;--> statement-breakpoint
ALTER TABLE `session` ADD `seen_revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `session` ADD `activity_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `session` ADD `failure` text;
--> statement-breakpoint
UPDATE `session` SET `activity_at` = `updated_at`;
