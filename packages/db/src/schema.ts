// Table definitions only: no Node APIs, so contracts and the Apps can import this file.
// Each file under `schema/` holds one module's tables (ADR-0016 §9); a foreign key may import the table it points at.
// JSON columns are text; the Server validates them on write and read.
export * from './schema/agents';
export * from './schema/blob';
export * from './schema/feed';
export * from './schema/projects';
export * from './schema/sessions';
export * from './schema/sync-jobs';
