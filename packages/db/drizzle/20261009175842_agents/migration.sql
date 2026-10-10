CREATE TABLE `agents` (
	`id` text PRIMARY KEY,
	`registry_id` text UNIQUE,
	`registry_metadata` text,
	`catalog_present` integer DEFAULT false NOT NULL,
	`catalog_synced_at` integer,
	`catalog_search_text` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_jobs` (
	`source` text NOT NULL,
	`scope` text NOT NULL,
	`status` text NOT NULL,
	`requested_at` integer NOT NULL,
	`completed_at` integer,
	`fetched_at` integer,
	`error` text,
	`rejected_values` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `sync_jobs_pk` PRIMARY KEY(`source`, `scope`)
);
