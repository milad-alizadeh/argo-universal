INSERT OR IGNORE INTO `agent_servers` (`id`, `env`)
SELECT `registry_id`,
  coalesce((SELECT json_group_object(json_extract(value, '$.name'), json_extract(value, '$.value'))
    FROM json_each(agents.configuration, '$.overrides.env')), '{}')
FROM `agents`
WHERE `registry_id` IS NOT NULL
  AND json_extract(`configuration`, '$.source') = 'registry'
  AND coalesce(json_extract(`configuration`, '$.removed'), 0) = 0;
--> statement-breakpoint
UPDATE `session` SET `agent` = (
  SELECT `registry_id` FROM `agents` WHERE `agents`.`id` = `session`.`agent`
)
WHERE `agent` IN (SELECT `id` FROM `agents` WHERE `registry_id` IS NOT NULL);
--> statement-breakpoint
DELETE FROM `agents` WHERE json_extract(`configuration`, '$.source') = 'custom';
