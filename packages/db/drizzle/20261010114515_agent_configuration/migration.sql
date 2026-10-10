ALTER TABLE `agents` ADD `configuration` text;--> statement-breakpoint
ALTER TABLE `agents` ADD `enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE `agents` SET `id` = 'claude' WHERE `registry_id` = 'claude-acp' AND NOT EXISTS (SELECT 1 FROM `agents` WHERE `id` = 'claude');--> statement-breakpoint
UPDATE `agents` SET `id` = 'codex' WHERE `registry_id` = 'codex-acp' AND NOT EXISTS (SELECT 1 FROM `agents` WHERE `id` = 'codex');--> statement-breakpoint
INSERT OR IGNORE INTO `agents` (`id`, `registry_id`) VALUES ('claude', 'claude-acp'), ('codex', 'codex-acp');--> statement-breakpoint
UPDATE `agents` SET `configuration` = '{"source":"registry","release":null,"overrides":{"args":[],"env":[]}}' WHERE `id` IN ('claude', 'codex') AND `configuration` IS NULL;
