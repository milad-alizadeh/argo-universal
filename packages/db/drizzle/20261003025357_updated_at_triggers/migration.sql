-- Drizzle's schema has no triggers, so they live here. An update that sets `updated_at` itself keeps its value.
CREATE TRIGGER `session_updated_at` AFTER UPDATE ON `session` FOR EACH ROW WHEN NEW.`updated_at` = OLD.`updated_at`
BEGIN
	UPDATE `session` SET `updated_at` = cast(unixepoch('subsec') * 1000 as integer) WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `feed_row_updated_at` AFTER UPDATE ON `feed_row` FOR EACH ROW WHEN NEW.`updated_at` = OLD.`updated_at`
BEGIN
	UPDATE `feed_row` SET `updated_at` = cast(unixepoch('subsec') * 1000 as integer) WHERE rowid = NEW.rowid;
END;
