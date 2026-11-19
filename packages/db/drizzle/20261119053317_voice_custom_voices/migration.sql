ALTER TABLE `server_settings` ADD `voice_custom_voices` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `server_settings` ADD `voice_instructions` text DEFAULT '' NOT NULL;