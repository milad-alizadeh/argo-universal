import { mkdtempSync, rmSync } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import {
  recordTerminalOwner,
  terminalOwners,
} from '../../lib/terminal-owner-record';

const folder = (): string => {
  const directory = mkdtempSync(join(tmpdir(), 'argo-shell-record-'));
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));

  return directory;
};

const record = {
  pid: 4242,
  token: '5a1f5a8e-6f64-4a53-9c43-0a0d9a2e3f11',
};

it('writes the record whole, leaving no pending file behind', async (): Promise<void> => {
  const directory = folder();
  const path = await recordTerminalOwner(directory, record);

  await expect(terminalOwners(directory).next()).resolves.toMatchObject({
    done: false,
    value: { path, record },
  });
  expect(await readdir(dirname(path))).toEqual([basename(path)]);
});

it('replaces the record of an earlier write at the same path', async (): Promise<void> => {
  const directory = folder();
  await recordTerminalOwner(directory, record);
  await recordTerminalOwner(directory, { ...record, pid: 7 });

  await expect(terminalOwners(directory).next()).resolves.toMatchObject({
    done: false,
    value: { record: { pid: 7 } },
  });
});

it('rejects a record with an unknown field or a token that is not a UUID', async () => {
  const directory = folder();
  const path = await recordTerminalOwner(directory, record);

  for (const [invalid, message] of [
    [{ ...record, extra: 1 }, 'Unrecognized key'],
    [{ ...record, token: 'nope' }, 'Invalid UUID'],
  ] as const) {
    await writeFile(path, JSON.stringify(invalid));
    await expect(terminalOwners(directory).next()).rejects.toThrow(message);
  }
});
