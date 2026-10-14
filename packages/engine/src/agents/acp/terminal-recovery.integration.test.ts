import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it, onTestFinished, vi } from 'vitest';
import { z } from 'zod';
import { resourceLaunch } from '#mocks/acp-resource';
import { startEngineTestHost } from '#mocks/engine';
import { launchLoginTerminal } from './terminal-process';

const terminalFolder = 'login-terminals';

const script = fileURLToPath(
  new URL('../../../mocks/login-terminal.mjs', import.meta.url),
);

const startTerminal = async (): Promise<{
  home: string;
  path: string;
  record: { pid: number; token: string };
}> => {
  const home = await mkdtemp(join(tmpdir(), 'argo-terminal-recovery-'));
  vi.stubEnv('ARGO_HOME', home);
  onTestFinished(async () => {
    await rm(home, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  const child = await launchLoginTerminal(
    {
      ...resourceLaunch,
      executable: process.execPath,
      args: [script],
      cwd: home,
    },
    () => {},
  );

  onTestFinished(() => child.close());
  const [name] = await readdir(join(home, terminalFolder));

  if (!name) throw new Error('Terminal ownership record is missing');
  const path = join(home, terminalFolder, name);

  const record = z
    .object({ pid: z.number(), token: z.string() })
    .parse(JSON.parse(await readFile(path, 'utf8')));

  return { home, path, record };
};

it('Engine startup releases an interrupted terminal group before accepting commands', async () => {
  const { home, record } = await startTerminal();
  process.kill(record.pid, 'SIGSTOP');
  const host = await startEngineTestHost({ home });
  expect(await host.caller.session.list({ archived: false })).toMatchObject({
    sessions: [],
  });
  expect(() => process.kill(record.pid, 0)).toThrow(/ESRCH/);
  expect(await readdir(join(home, terminalFolder))).toEqual([]);
}, 15000);

it('Engine startup retains an unmatched terminal record without signaling its process', async () => {
  const { home, path, record } = await startTerminal();
  await writeFile(path, JSON.stringify({ ...record, token: randomUUID() }));
  await expect(startEngineTestHost({ home })).rejects.toThrow(
    /Actor terminated/,
  );
  expect(() => process.kill(record.pid, 0)).not.toThrow();
  expect(await readFile(path, 'utf8')).toContain(String(record.pid));
  await writeFile(path, JSON.stringify(record));
}, 15000);
