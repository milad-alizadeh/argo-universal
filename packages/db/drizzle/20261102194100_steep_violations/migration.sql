ALTER TABLE `project` ADD `delete_worktree_on_archive` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `session` ADD `keep_checkout` integer DEFAULT false NOT NULL;