CREATE TABLE `agents` (
	`id` text PRIMARY KEY,
	`registry_id` text UNIQUE,
	`registry_metadata` text,
	`catalog_present` integer DEFAULT false NOT NULL,
	`catalog_synced_at` integer
);
