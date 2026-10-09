CREATE TABLE `agent_catalog_cache` (
	`id` integer PRIMARY KEY,
	`payload` text NOT NULL,
	`fetched_at` integer NOT NULL
);
