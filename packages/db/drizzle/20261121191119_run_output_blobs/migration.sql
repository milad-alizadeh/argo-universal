ALTER TABLE `run` ADD `output_blob_id` text REFERENCES blob(id);--> statement-breakpoint
CREATE INDEX `run_output_blob_index` ON `run` (`output_blob_id`);