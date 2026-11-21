ALTER TABLE `server_settings` RENAME COLUMN `voice_calls` TO `conversations`;--> statement-breakpoint
ALTER TABLE `server_settings` RENAME COLUMN `voice_provider` TO `conversation_provider`;--> statement-breakpoint
ALTER TABLE `server_settings` RENAME COLUMN `voice_instructions` TO `conversation_instructions`;--> statement-breakpoint
ALTER TABLE `server_settings` RENAME COLUMN `voice_call_options` TO `conversation_options`;--> statement-breakpoint
UPDATE `session` SET `prompt_queue` = REPLACE(`prompt_queue`, '"sender":{"type":"voice"}', '"sender":{"type":"conversation"}') WHERE `prompt_queue` LIKE '%"sender":{"type":"voice"}%';--> statement-breakpoint
UPDATE `feed_row` SET `payload` = REPLACE(`payload`, '"sender":{"type":"voice"}', '"sender":{"type":"conversation"}') WHERE `payload` LIKE '%"sender":{"type":"voice"}%';
