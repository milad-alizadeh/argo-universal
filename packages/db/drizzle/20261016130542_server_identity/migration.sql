CREATE TABLE `server_identity` (
	`singleton` integer PRIMARY KEY,
	`server_id` text NOT NULL,
	CONSTRAINT "server_identity_singleton" CHECK("singleton" = 1)
);
