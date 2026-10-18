CREATE TABLE `plugin_state` (
	`id` text PRIMARY KEY,
	`enabled` integer DEFAULT true NOT NULL,
	`settings` text DEFAULT '{}' NOT NULL
);
