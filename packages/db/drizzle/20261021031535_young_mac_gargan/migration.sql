CREATE TABLE `plugin_account` (
	`id` text PRIMARY KEY,
	`host` text NOT NULL,
	`label` text NOT NULL,
	`provided_by` text NOT NULL,
	CONSTRAINT `plugin_account_host_id_unique` UNIQUE(`host`,`id`)
);
--> statement-breakpoint
CREATE TABLE `plugin_account_grant` (
	`host` text NOT NULL,
	`account` text NOT NULL,
	`plugin` text NOT NULL,
	`allowed` integer NOT NULL,
	CONSTRAINT `plugin_account_grant_pk` PRIMARY KEY(`host`, `account`, `plugin`),
	CONSTRAINT `fk_plugin_account_grant_host_account_plugin_account_host_id_fk` FOREIGN KEY (`host`,`account`) REFERENCES `plugin_account`(`host`,`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `project_account` (
	`project_id` text NOT NULL,
	`host` text NOT NULL,
	`account` text NOT NULL,
	CONSTRAINT `project_account_pk` PRIMARY KEY(`project_id`, `host`),
	CONSTRAINT `fk_project_account_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_project_account_host_account_plugin_account_host_id_fk` FOREIGN KEY (`host`,`account`) REFERENCES `plugin_account`(`host`,`id`) ON DELETE CASCADE
);
