CREATE TABLE `local_network_access` (
	`singleton` integer PRIMARY KEY,
	`enabled` integer DEFAULT false NOT NULL,
	CONSTRAINT "local_network_access_singleton" CHECK("singleton" = 1)
);
