import { dirname } from 'node:path';
import type { Database } from '@repo/db';
import { openTestDatabase } from './database';

// Where a test Engine keeps its storage: what the test supplied, or a new database.
type StorageOptions = {
  database?: Database;
  home?: string;
  runtimeDirectory?: string;
};

export type TestStorage = {
  home: string;
  storage: ReturnType<typeof openTestDatabase> | undefined;
};

export const resolveTestStorage = (options: StorageOptions): TestStorage => {
  const storage = chooseTestStorage(options);
  const home = testHome(options, storage);

  if (!home) throw new Error('Engine test storage is missing');

  return { home, storage };
};

const chooseTestStorage = (
  options: StorageOptions,
): ReturnType<typeof openTestDatabase> | undefined =>
  hasStorage(options) ? undefined : openTestDatabase();

const hasStorage = (options: StorageOptions): boolean =>
  [options.database, options.home, options.runtimeDirectory].some(Boolean);

const testHome = (
  options: StorageOptions,
  storage: TestStorage['storage'],
): string | undefined => options.home ?? fallbackHome(options, storage);

const fallbackHome = (
  options: StorageOptions,
  storage: TestStorage['storage'],
): string | undefined =>
  options.database
    ? databaseHome(options.database)
    : otherHome(options, storage);

const databaseHome = (database: Database): string =>
  dirname(database.$client.location() ?? '');

const otherHome = (
  options: StorageOptions,
  storage: TestStorage['storage'],
): string | undefined => options.runtimeDirectory ?? storage?.directory;

export const discardTestStorage = (storage: TestStorage['storage']): void => {
  storage?.remove();
};
