CREATE TABLE `run` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`checkout_path` text NOT NULL,
	`name` text NOT NULL,
	`command` text NOT NULL,
	`cwd` text NOT NULL,
	`port` integer NOT NULL,
	`url` text NOT NULL,
	`pid` integer,
	`status` text NOT NULL,
	`exit_code` integer,
	`started_at` integer NOT NULL,
	`ready_at` integer,
	`ended_at` integer,
	CONSTRAINT `fk_run_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `run_checkout_index` ON `run` (`project_id`,`checkout_path`);