import { existsSync } from 'node:fs';
import {
  mkdir,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { scratch } from '#mocks/probe-plugin';
import { CapabilityRefusal } from './capability-refusal';
import { PluginAccess } from './plugin-access';
import { fsCall } from './plugin-file-calls';

const secret = 'SYNTHETIC_SECRET';

type Folders = { access: PluginAccess; data: string; outside: string };

// A Plugin with no Capabilities, its data folder, and a folder it may never reach.
async function folders(): Promise<Folders> {
  const data = join(await scratch(), 'plugin-data/probe');
  const outside = await scratch();

  await mkdir(data, { recursive: true });
  await writeFile(join(outside, 'a.txt'), secret);

  const access = new PluginAccess({
    grant: { capabilities: [], codeFolder: null },
    dataFolder: data,
    projects: async (): Promise<string[]> => [],
  });

  return { access, data, outside };
}

/*
 * Each swap happens after the checker allowed the path and before the call opens it: the window
 * the check on the opened file closes.
 */
it('refuses a read when the checked file became a symlink', async () => {
  const { access, data, outside } = await folders();
  const file = join(data, 'a.txt');

  await writeFile(file, 'mine');
  const path = await access.checkPath(file, 'read');

  await rm(file);
  await symlink(join(outside, 'a.txt'), file);

  await expect(fsCall(access, { action: 'read', path }, path)).rejects.toThrow(
    new CapabilityRefusal(`${path} became a symlink`),
  );
});

it('refuses a read when a checked folder was swapped for a symlink', async () => {
  const { access, data, outside } = await folders();
  const folder = join(data, 'notes');

  await mkdir(folder);
  await writeFile(join(folder, 'a.txt'), 'mine');
  const path = await access.checkPath(join(folder, 'a.txt'), 'read');

  await rename(folder, join(data, 'old-notes'));
  await symlink(outside, folder);

  await expect(fsCall(access, { action: 'read', path }, path)).rejects.toThrow(
    new CapabilityRefusal(`${path} changed while it was opened`),
  );
});

it('creates no folder outside when a missing parent becomes a symlink', async () => {
  const { access, data, outside } = await folders();
  const path = await access.checkPath(join(data, 'new/sub/a.txt'), 'write');

  await symlink(outside, join(data, 'new'));

  await expect(
    fsCall(access, { action: 'write', path, content: 'x' }, path),
  ).rejects.toThrow(
    new CapabilityRefusal(`${join(data, 'new')} changed while it was created`),
  );
  expect(existsSync(join(outside, 'sub'))).toBe(false);
  expect(await readFile(join(outside, 'a.txt'), 'utf8')).toBe(secret);
});

it('names the path asked for, never where its symlink leads', async () => {
  const { access, data, outside } = await folders();
  const link = join(data, 'linked.txt');

  await symlink(join(outside, 'a.txt'), link);

  const refused = await access.checkPath(link, 'read').catch(String);

  expect(refused).toContain(link);
  expect(refused).not.toContain(outside);
});
