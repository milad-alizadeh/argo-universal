CREATE TABLE `blob` (
	`id` text PRIMARY KEY,
	`mime` text NOT NULL,
	`bytes` integer NOT NULL,
	`width` integer,
	`height` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `blob_ref` (
	`blob_id` text NOT NULL,
	`session_id` text NOT NULL,
	CONSTRAINT `blob_ref_pk` PRIMARY KEY(`blob_id`, `session_id`),
	CONSTRAINT `fk_blob_ref_blob_id_blob_id_fk` FOREIGN KEY (`blob_id`) REFERENCES `blob`(`id`),
	CONSTRAINT `fk_blob_ref_session_id_session_id_fk` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `feed_row` (
	`session_id` text NOT NULL,
	`position` integer NOT NULL,
	`id` text NOT NULL,
	`session_update` text NOT NULL,
	`revision` integer NOT NULL,
	`turn_id` text,
	`state` text NOT NULL,
	`payload` text NOT NULL,
	`payload_version` integer NOT NULL,
	`source_ref` text,
	`search_text` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT `feed_row_pk` PRIMARY KEY(`session_id`, `position`),
	CONSTRAINT `fk_feed_row_session_id_session_id_fk` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY,
	`path` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`agent` text NOT NULL,
	`vendor_session_id` text,
	`parent_session_id` text,
	`checkout_path` text NOT NULL,
	`checkout_branch` text,
	`vendor_ref` text,
	`epoch` integer DEFAULT 0 NOT NULL,
	`projection_version` integer NOT NULL,
	`max_revision` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_session_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_session_parent_session_id_session_id_fk` FOREIGN KEY (`parent_session_id`) REFERENCES `session`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `turn` (
	`id` text PRIMARY KEY,
	`session_id` text NOT NULL,
	`status` text NOT NULL,
	`stop_reason` text,
	`error` text,
	`usage` text,
	`started_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`ended_at` integer,
	CONSTRAINT `fk_turn_session_id_session_id_fk` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feed_row_session_id_id_unique` ON `feed_row` (`session_id`,`id`);--> statement-breakpoint
CREATE INDEX `feed_row_session_id_revision_index` ON `feed_row` (`session_id`,`revision`);--> statement-breakpoint
CREATE INDEX `feed_row_session_id_session_update_position_index` ON `feed_row` (`session_id`,`session_update`,`position`);