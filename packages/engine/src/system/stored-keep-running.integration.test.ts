import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '@repo/db';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { readStoredKeepRunning } from './stored-keep-running';

let home: string;

beforeEach((): void => {
  home = mkdtempSync(join(tmpdir(), 'stored-keep-running-'));
});

afterEach((): void => {
  rmSync(home, { recursive: true, force: true });
});

const databaseFile = (): string => join(home, 'argo.db');

const insertSetting = (value: number | string): string =>
  `INSERT INTO server_settings (singleton, keep_running_after_quit) VALUES (1, ${JSON.stringify(value).replaceAll('"', "'")})`;

// A Server's database as a stopped Server leaves it, with the setting row if `value` is given.
function storeSetting(value?: number | string): void {
  const database = openDatabase(databaseFile());

  if (value !== undefined) database.$client.exec(insertSetting(value));
  database.$client.close();
}

it('reads a stored true', (): void => {
  storeSetting(1);

  expect(readStoredKeepRunning(home)).toBe(true);
});

it('reads a stored false', (): void => {
  storeSetting(0);

  expect(readStoredKeepRunning(home)).toBe(false);
});

it('reads a Server that never stored the setting as off', (): void => {
  storeSetting();

  expect(readStoredKeepRunning(home)).toBe(false);
});

it('throws when there is no database file, and creates none', (): void => {
  expect(() => readStoredKeepRunning(home)).toThrow(/unable to open database/);
  expect(() => readFileSync(databaseFile())).toThrow(/ENOENT/);
});

it('throws on a file that is not a database', (): void => {
  writeFileSync(databaseFile(), 'not a database'.repeat(500));

  expect(() => readStoredKeepRunning(home)).toThrow(/Failed query/);
});

it('throws on a database without the settings table', (): void => {
  const database = openDatabase(databaseFile());
  database.$client.exec('DROP TABLE server_settings');
  database.$client.close();

  expect(() => readStoredKeepRunning(home)).toThrow(/Failed query/);
});

it.each([2, -1, 'true'])(
  'throws on a damaged row holding %j rather than read it as true',
  (value): void => {
    storeSetting(value);

    expect(() => readStoredKeepRunning(home)).toThrow(/expected one of 0\|1/);
  },
);

it('reads the last committed answer while a running Server holds the database mid-write, and writes nothing', (): void => {
  const server = openDatabase(databaseFile());
  server.$client.exec(insertSetting(1));
  server.$client.exec('BEGIN IMMEDIATE');
  server.$client.exec('UPDATE server_settings SET keep_running_after_quit = 0');
  const before = readFileSync(databaseFile());

  try {
    expect(readStoredKeepRunning(home)).toBe(true);
    expect(readFileSync(databaseFile())).toEqual(before);
  } finally {
    server.$client.exec('ROLLBACK');
    server.$client.close();
  }
});
