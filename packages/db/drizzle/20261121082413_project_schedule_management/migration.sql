ALTER TABLE `project_schedule` ADD `paused` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `project_schedule_occurrence` ADD `session_id` text;--> statement-breakpoint
UPDATE `project_schedule_occurrence` SET `session_id` = json_extract(`result`, '$.sessionId') WHERE json_extract(`result`, '$.outcome') = 'started';--> statement-breakpoint
CREATE INDEX `project_schedule_history` ON `project_schedule_occurrence` (`schedule_id`,`at`,`id`);--> statement-breakpoint
CREATE INDEX `project_schedule_run_session` ON `project_schedule_occurrence` (`schedule_id`,`session_id`);