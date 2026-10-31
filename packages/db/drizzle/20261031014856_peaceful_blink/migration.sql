CREATE TABLE `server_settings` (
	`singleton` integer PRIMARY KEY,
	`keep_running_after_quit` integer DEFAULT false NOT NULL,
	CONSTRAINT "server_settings_singleton" CHECK("singleton" = 1)
);
