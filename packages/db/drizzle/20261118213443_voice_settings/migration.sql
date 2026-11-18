ALTER TABLE `server_settings` ADD `voice_calls` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `server_settings` ADD `voice_provider` text;--> statement-breakpoint
ALTER TABLE `server_settings` ADD `voice_name` text;