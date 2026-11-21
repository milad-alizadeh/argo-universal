CREATE TABLE `closed_follow_through` (
	`turn_id` text PRIMARY KEY,
	CONSTRAINT `fk_closed_follow_through_turn_id_turn_id_fk` FOREIGN KEY (`turn_id`) REFERENCES `turn`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `delegated_skill` (
	`id` text PRIMARY KEY,
	`starter_id` text NOT NULL,
	`origin_turn_id` text NOT NULL,
	`destination_id` text NOT NULL,
	`name` text NOT NULL,
	`arguments` text NOT NULL,
	`command_digest` text NOT NULL,
	`dispatched` integer DEFAULT false NOT NULL,
	CONSTRAINT `fk_delegated_skill_starter_id_session_id_fk` FOREIGN KEY (`starter_id`) REFERENCES `session`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_delegated_skill_origin_turn_id_turn_id_fk` FOREIGN KEY (`origin_turn_id`) REFERENCES `turn`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_delegated_skill_destination_id_session_id_fk` FOREIGN KEY (`destination_id`) REFERENCES `session`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `delegated_turn` (
	`id` text PRIMARY KEY,
	`starter_id` text NOT NULL,
	`source_id` text NOT NULL,
	`turn_id` text NOT NULL,
	`delivered` integer DEFAULT false NOT NULL,
	`revoked` integer DEFAULT false NOT NULL,
	CONSTRAINT `fk_delegated_turn_starter_id_session_id_fk` FOREIGN KEY (`starter_id`) REFERENCES `session`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_delegated_turn_source_id_session_id_fk` FOREIGN KEY (`source_id`) REFERENCES `session`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `delegated_skill_destination_index` ON `delegated_skill` (`destination_id`);--> statement-breakpoint
CREATE INDEX `delegated_turn_pending_index` ON `delegated_turn` (`delivered`,`revoked`);--> statement-breakpoint
CREATE INDEX `delegated_turn_starter_index` ON `delegated_turn` (`starter_id`);