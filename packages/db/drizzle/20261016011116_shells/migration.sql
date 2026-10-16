CREATE TABLE `shell` (
	`session_id` text NOT NULL,
	`id` text NOT NULL,
	`tool_call_id` text NOT NULL,
	`command` text NOT NULL,
	`cwd` text NOT NULL,
	`status` text NOT NULL,
	`exit_code` integer,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`output_blob_id` text,
	CONSTRAINT `shell_pk` PRIMARY KEY(`session_id`, `id`),
	CONSTRAINT `fk_shell_session_id_session_id_fk` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_shell_output_blob_id_blob_id_fk` FOREIGN KEY (`output_blob_id`) REFERENCES `blob`(`id`)
);
