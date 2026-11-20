CREATE TABLE `session_schedule` (
	`id` text PRIMARY KEY,
	`session_id` text NOT NULL,
	`prompt` text NOT NULL,
	`interval_seconds` integer NOT NULL,
	`next_at` integer NOT NULL,
	`last_queued_at` integer,
	`paused` integer DEFAULT false NOT NULL,
	CONSTRAINT `fk_session_schedule_session_id_session_id_fk` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `session_schedule_due` ON `session_schedule` (`paused`,`next_at`);