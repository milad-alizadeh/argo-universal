ALTER TABLE `agents` ADD `configuration` text;--> statement-breakpoint
ALTER TABLE `agents` ADD `enabled` integer DEFAULT true NOT NULL;
