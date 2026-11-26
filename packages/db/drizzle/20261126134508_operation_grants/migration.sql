CREATE TABLE `operation_grant` (
	`project_id` text NOT NULL,
	`operation_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT `operation_grant_pk` PRIMARY KEY(`project_id`, `operation_id`),
	CONSTRAINT `fk_operation_grant_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE
);
