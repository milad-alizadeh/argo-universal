CREATE TABLE `plugin_draft` (
	`plugin_id` text PRIMARY KEY,
	`session_id` text,
	`picks` text DEFAULT '[]' NOT NULL,
	`comments` text DEFAULT '[]' NOT NULL,
	`chosen_at` integer,
	CONSTRAINT `fk_plugin_draft_session_id_session_id_fk` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE SET NULL
);
