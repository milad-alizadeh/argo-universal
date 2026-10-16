import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const aliasPattern = /^[A-Za-z_]\w*$/;

// A Plugin's own SQLite file: not Argo's database, so it is never migrated here. The Plugin runs its own migrations.
export function openPluginDatabase(filePath: string): DatabaseSync {
  mkdirSync(dirname(filePath), { recursive: true });
  const client = new DatabaseSync(filePath);
  client.exec('PRAGMA journal_mode = WAL');

  return client;
}

export const openReadOnlyDatabase = (filePath: string): DatabaseSync =>
  new DatabaseSync(filePath, { readOnly: true });

// The Server queries a Plugin's file next to its own tables but can never write to it.
export function attachReadOnly(
  target: DatabaseSync,
  filePath: string,
  alias: string,
): void {
  if (!aliasPattern.test(alias))
    throw new Error(`Invalid attach alias: ${alias}`);
  const uri = `file:${encodeURI(filePath).replaceAll('?', '%3F')}?mode=ro`;
  target.prepare(`ATTACH DATABASE ? AS ${alias}`).run(uri);
}
