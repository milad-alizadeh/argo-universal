CREATE TABLE `agent_catalog_sync_request` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT,
	`request_id` text NOT NULL UNIQUE,
	`sync_id` text NOT NULL,
	`status` text NOT NULL,
	`requested_at` integer NOT NULL,
	`completed_at` integer,
	`fetched_at` integer,
	`error` text,
	`changed_ids` text DEFAULT '[]' NOT NULL,
	`rejected_values` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `agents` ADD `catalog_search_text` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `agent_catalog_sync_request_sync_id_index` ON `agent_catalog_sync_request` (`sync_id`);--> statement-breakpoint
CREATE INDEX `agent_catalog_sync_request_status_index` ON `agent_catalog_sync_request` (`status`);