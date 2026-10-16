CREATE TABLE `agent_servers` (
	`id` text PRIMARY KEY,
	`env` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `registry_cache` (
	`id` integer PRIMARY KEY,
	`json` text,
	`fetched_at` integer,
	CONSTRAINT "registry_cache_singleton" CHECK("id" = 1)
);
