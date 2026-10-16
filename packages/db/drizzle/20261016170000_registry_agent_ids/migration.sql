UPDATE `agents`
SET `id` = `registry_id`
WHERE (`id` = 'claude' AND `registry_id` = 'claude-acp')
   OR (`id` = 'codex' AND `registry_id` = 'codex-acp');
