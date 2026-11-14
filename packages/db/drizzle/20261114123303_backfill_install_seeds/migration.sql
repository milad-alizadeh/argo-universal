-- Install seeds (packages/engine/src/agents/vendor.ts) reach Agents installed before them (ADR-0053); a key the person set is kept.
UPDATE `agent_servers` SET `env` = json_set(`env`, '$.CLAUDE_CODE_ENABLE_TODO_TOOLS', '1') WHERE `id` = 'claude-acp' AND json_type(`env`, '$.CLAUDE_CODE_ENABLE_TODO_TOOLS') IS NULL;--> statement-breakpoint
UPDATE `agent_servers` SET `env` = json_set(`env`, '$.CODEX_CONFIG', '{"tools":{"update_plan":{"enabled":true}}}') WHERE `id` = 'codex-acp' AND json_type(`env`, '$.CODEX_CONFIG') IS NULL;
