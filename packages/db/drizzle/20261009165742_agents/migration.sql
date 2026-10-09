CREATE TABLE `agents` (
	`id` text PRIMARY KEY,
	`registry_id` text UNIQUE,
	`registry_metadata` text,
	`catalog_present` integer DEFAULT false NOT NULL,
	`catalog_synced_at` integer
);
--> statement-breakpoint
INSERT INTO agents (id, registry_id, registry_metadata, catalog_present, catalog_synced_at)
SELECT json_extract(value, '$.id'), json_extract(value, '$.registryId'),
       json_extract(value, '$.registryMetadata'), json_extract(value, '$.catalogPresent'),
       json_extract(value, '$.catalogSyncedAt')
FROM agent_catalog_cache,
     json_each(convert_legacy_agent_catalog(payload, fetched_at));
--> statement-breakpoint
DROP TABLE `agent_catalog_cache`;
