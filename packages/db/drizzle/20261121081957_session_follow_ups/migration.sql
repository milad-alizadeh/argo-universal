ALTER TABLE `session_schedule` ADD `ends_at` integer;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_session_schedule` (
	`id` text PRIMARY KEY,
	`session_id` text NOT NULL,
	`prompt` text NOT NULL,
	`interval_seconds` integer,
	`ends_at` integer,
	`next_at` integer NOT NULL,
	`last_queued_at` integer,
	`paused` integer DEFAULT false NOT NULL,
	CONSTRAINT `fk_session_schedule_session_id_session_id_fk` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_session_schedule`(`id`, `session_id`, `prompt`, `interval_seconds`, `next_at`, `last_queued_at`, `paused`) SELECT `id`, `session_id`, `prompt`, `interval_seconds`, `next_at`, `last_queued_at`, `paused` FROM `session_schedule`;--> statement-breakpoint
DROP TABLE `session_schedule`;--> statement-breakpoint
ALTER TABLE `__new_session_schedule` RENAME TO `session_schedule`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `session_schedule_due` ON `session_schedule` (`paused`,`next_at`);