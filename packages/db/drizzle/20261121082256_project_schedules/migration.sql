CREATE TABLE `project_schedule` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`settings` text NOT NULL,
	`next_at` integer NOT NULL,
	`latest_session_id` text,
	CONSTRAINT `fk_project_schedule_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `project_schedule_occurrence` (
	`id` text PRIMARY KEY,
	`schedule_id` text NOT NULL,
	`at` integer NOT NULL,
	`result` text NOT NULL,
	CONSTRAINT `fk_project_schedule_occurrence_schedule_id_project_schedule_id_fk` FOREIGN KEY (`schedule_id`) REFERENCES `project_schedule`(`id`) ON DELETE CASCADE
);
