CREATE INDEX `session_parent_session_id_index` ON `session` (`parent_session_id`);--> statement-breakpoint
CREATE INDEX `session_started_by_session_id_index` ON `session` (`started_by_session_id`);