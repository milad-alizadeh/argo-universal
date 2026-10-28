CREATE TABLE `agent_access` (
	`singleton` integer PRIMARY KEY,
	`enabled` integer DEFAULT true NOT NULL,
	CONSTRAINT "agent_access_singleton" CHECK("singleton" = 1)
);
