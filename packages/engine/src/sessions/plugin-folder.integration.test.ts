import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { writePluginFolder } from './plugin-folder';

let checkout = '';

beforeEach(async () => {
  checkout = await mkdtemp(join(tmpdir(), 'plugin-folder-'));
});

afterEach(() => rm(checkout, { recursive: true, force: true }));

const shown = 'plugins/made';

it('writes every file into a folder it made, and refuses a folder that is there', async () => {
  const directory = join(checkout, shown);

  await writePluginFolder(directory, shown, [['a.txt', 'one']]);

  expect(await readFile(join(directory, 'a.txt'), 'utf8')).toBe('one');
  await expect(
    writePluginFolder(directory, shown, [['a.txt', 'two']]),
  ).rejects.toThrow('plugins/made already exists');
  expect(await readFile(join(directory, 'a.txt'), 'utf8')).toBe('one');
});

it('leaves no folder behind when a write fails, so a retry succeeds', async () => {
  const directory = join(checkout, shown);

  // `a` is a file, so the second path cannot be a folder inside it.
  await expect(
    writePluginFolder(directory, shown, [
      ['a', 'file'],
      ['a/b', 'inside a file'],
    ]),
  ).rejects.toThrow('EEXIST');
  expect(existsSync(directory)).toBe(false);

  await writePluginFolder(directory, shown, [['a', 'file']]);

  expect(await readFile(join(directory, 'a'), 'utf8')).toBe('file');
});

it('does not remove a folder another caller made first', async () => {
  const directory = join(checkout, shown);

  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'mine.txt'), 'kept');

  await expect(
    writePluginFolder(directory, shown, [['a.txt', 'x']]),
  ).rejects.toThrow('already exists');
  expect(await readFile(join(directory, 'mine.txt'), 'utf8')).toBe('kept');
});
