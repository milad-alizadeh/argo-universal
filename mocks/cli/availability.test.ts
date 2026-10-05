import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { mockClis } from './index';

const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});

it.each(Object.entries(mockClis))(
  '%s can be absent from PATH',
  async (_, cli) => {
    const directory = await mkdtemp(join(tmpdir(), 'cli-availability-'));
    directories.push(directory);
    const executable = await cli.write(directory, {
      recording: cli.recordings.turn,
      availability: 'not_installed',
    });
    await expect(access(executable)).rejects.toMatchObject({ code: 'ENOENT' });
  },
);
