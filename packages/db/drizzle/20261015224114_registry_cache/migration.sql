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
--> statement-breakpoint
INSERT INTO `registry_cache` (`id`, `json`, `fetched_at`)
SELECT 1, json_object('version', '1.0.0', 'agents', json_group_array(json(registry_metadata)), 'extensions', json('[]')), 0
FROM `agents` WHERE `catalog_present` = 1;
