import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { constants, DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';

const aliasPattern = /^[A-Za-z_]\w*$/;

// These move where SQLite writes its own files, which would put them outside the Plugin's folder.
const redirectingPragmas = new Set([
  'temp_store_directory',
  'data_store_directory',
]);

type AuthorizerDetails = [subject: string | null, name: string | null];

/*
 * SQLite asks before it opens a second file, so refusing these action codes leaves
 * no path to parse and no spelling to miss: a URI name, `:memory:` and `VACUUM INTO`
 * (whose target SQLite authorises as an attach) are all refused by the same answer.
 */
const refusals = new Map<number, (details: AuthorizerDetails) => boolean>([
  [constants.SQLITE_ATTACH, (): boolean => true],
  [constants.SQLITE_DETACH, (): boolean => true],
  [
    constants.SQLITE_PRAGMA,
    ([pragma]): boolean => redirectingPragmas.has(pragma ?? ''),
  ],
  [constants.SQLITE_FUNCTION, ([, name]): boolean => name === 'load_extension'],
]);

const confinedToOwnFile = (
  action: number,
  subject: string | null,
  name: string | null,
): number =>
  refusals.get(action)?.([subject, name])
    ? constants.SQLITE_DENY
    : constants.SQLITE_OK;

// A Plugin's own SQLite file: not Argo's database, so it is never migrated here. The Plugin runs its own migrations.
export function openPluginDatabase(filePath: string): DatabaseSync {
  mkdirSync(dirname(filePath), { recursive: true });
  const client = new DatabaseSync(filePath);
  client.exec('PRAGMA journal_mode = WAL');
  client.setAuthorizer(confinedToOwnFile);

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
  const uri = `${pathToFileURL(filePath).href}?mode=ro`;
  target.prepare(`ATTACH DATABASE ? AS ${alias}`).run(uri);
}
