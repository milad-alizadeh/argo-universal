CREATE TABLE `run_settings` (
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`env` text,
	`port` integer,
	`trusted` text,
	`auto_start` text,
	CONSTRAINT `run_settings_pk` PRIMARY KEY(`project_id`, `name`),
	CONSTRAINT `fk_run_settings_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE
);
