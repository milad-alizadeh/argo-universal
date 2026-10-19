CREATE TABLE `agent_options` (
	`agent` text NOT NULL,
	`project_id` text NOT NULL,
	`config_options` text NOT NULL,
	`revision` integer NOT NULL,
	CONSTRAINT `agent_options_pk` PRIMARY KEY(`agent`, `project_id`),
	CONSTRAINT `fk_agent_options_agent_agent_servers_id_fk` FOREIGN KEY (`agent`) REFERENCES `agent_servers`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_agent_options_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE
);
