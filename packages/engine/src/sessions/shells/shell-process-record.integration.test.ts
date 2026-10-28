import { mkdtempSync, rmSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import {
  ShellProcessRecord,
  writeShellProcessRecord,
} from './shell-process-record';

const folder = (): string => {
  const directory = mkdtempSync(join(tmpdir(), 'argo-shell-record-'));
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));

  return directory;
};

const recordFile = 'record.json';

const record = {
  pid: 4242,
  token: '5a1f5a8e-6f64-4a53-9c43-0a0d9a2e3f11',
};

it('writes the record whole, leaving no pending file behind', async (): Promise<void> => {
  const directory = folder();
  const path = join(directory, recordFile);

  await writeShellProcessRecord(path, record);

  expect(
    ShellProcessRecord.parse(JSON.parse(await readFile(path, 'utf8'))),
  ).toEqual(record);
  expect(await readdir(directory)).toEqual([recordFile]);
});

it('replaces the record of an earlier write at the same path', async (): Promise<void> => {
  const directory = folder();
  const path = join(directory, recordFile);
  await writeShellProcessRecord(path, record);
  await writeShellProcessRecord(path, { ...record, pid: 7 });

  expect(
    ShellProcessRecord.parse(JSON.parse(await readFile(path, 'utf8'))),
  ).toMatchObject({ pid: 7 });
});

it('rejects a record with an unknown field or a token that is not a UUID', (): void => {
  expect(ShellProcessRecord.safeParse({ ...record, extra: 1 }).success).toBe(
    false,
  );
  expect(
    ShellProcessRecord.safeParse({ ...record, token: 'nope' }).success,
  ).toBe(false);
});
