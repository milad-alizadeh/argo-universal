import { link, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import {
  installed,
  probeResult,
  probeSource,
  registeredProject,
  scratch,
} from '#mocks/probe-plugin';
import { pluginLog, refusal, refusedLines, runProbe } from '#mocks/probe-run';
import { argoLimitBytes } from '../services/plugin-limits';

const outsideReason = 'outside';

const secretFile = 'secret.txt';

const secret = 'SYNTHETIC_SECRET';

it('reads a registered Project and reads, writes, lists and stats the data folder, with caps', async () => {
  const project = await registeredProject();

  await writeFile(join(project, 'notes.md'), 'project notes');
  await writeFile(join(project, 'big.txt'), 'x'.repeat(argoLimitBytes + 1));

  const { results, log, data } = await runProbe({
    calls: {
      write: `argo.fs.write('$DATA/nested/a.txt', 'hello')`,
      read: `argo.fs.read('$DATA/nested/a.txt')`,
      list: `argo.fs.list('$DATA/nested')`,
      stat: `argo.fs.stat('$DATA/nested/a.txt')`,
      project: `argo.fs.read(${JSON.stringify(join(project, 'notes.md'))})`,
      over: `argo.fs.read(${JSON.stringify(join(project, 'big.txt'))})`,
      tooBig: `argo.fs.write('$DATA/huge.txt', 'x'.repeat(${argoLimitBytes + 1}))`,
    },
  });

  expect(results).toMatchObject({
    write: { value: null },
    read: { value: 'hello' },
    list: { value: [{ name: 'a.txt', kind: 'file' }] },
    stat: { value: { kind: 'file', size: 5 } },
    project: { value: 'project notes' },
    over: { error: expect.stringContaining('read limit') },
    tooBig: { error: expect.stringContaining('write limit') },
  });
  expect(log).toContain(`Plugin probe: argo.fs.write ${data}/nested/a.txt`);
});

type Paths = { project: string; outside: string };

it.each([
  {
    name: 'a write to a registered Project',
    call: ({ project }: Paths): string =>
      `argo.fs.write('${project}/README.md', 'x')`,
    reason: 'never writes to a Project',
  },
  {
    name: "a write to the Plugin's code folder",
    call: (): string => `argo.fs.write('$CODE/index.mjs', 'x')`,
    reason: 'code folder',
  },
  {
    name: 'a read outside the data folder and Projects',
    call: ({ outside }: Paths): string =>
      `argo.fs.read('${outside}/${secretFile}')`,
    reason: outsideReason,
  },
  {
    name: 'a .. escape from the data folder',
    call: ({ outside }: Paths): string =>
      `argo.fs.read('$DATA/../../..${outside}/${secretFile}')`,
    reason: outsideReason,
  },
  {
    name: 'a symlink in the data folder leading outside',
    call: (): string => `argo.fs.read('$DATA/linked.txt')`,
    reason: outsideReason,
  },
  {
    name: 'a write through a symlinked folder leading outside',
    call: (): string => `argo.fs.write('$DATA/linked-folder/new.txt', 'x')`,
    reason: outsideReason,
  },
  {
    name: 'a hard link in the data folder',
    call: (): string => `argo.fs.read('$DATA/hard.txt')`,
    reason: 'hard links',
  },
  {
    name: 'a relative path',
    call: (): string => `argo.fs.read('${secretFile}')`,
    reason: 'not an absolute path',
  },
  {
    name: 'a write to a git folder in the data folder',
    call: (): string => `argo.fs.write('$DATA/repo/.git/config', 'x')`,
    reason: 'git repository',
  },
  {
    name: 'a HEAD file, which makes its folder a bare git repository',
    call: (): string =>
      `argo.fs.write('$DATA/bare/HEAD', 'ref: refs/heads/main')`,
    reason: 'git repository',
  },
  {
    name: 'a listing outside',
    call: ({ outside }: Paths): string => `argo.fs.list('${outside}')`,
    reason: outsideReason,
  },
])('refuses $name and logs it once', async ({ call, reason }) => {
  const project = await registeredProject();
  const outside = await scratch();

  await writeFile(join(project, 'README.md'), 'original');
  await writeFile(join(outside, secretFile), secret);

  const probe = await installed(
    probeSource({ refused: call({ project, outside }) }),
  );

  await mkdir(probe.data, { recursive: true });
  await symlink(join(outside, secretFile), join(probe.data, 'linked.txt'));
  await symlink(outside, join(probe.data, 'linked-folder'));
  await link(join(outside, secretFile), join(probe.data, 'hard.txt'));

  const { caller } = await startEngineTestHost({ home: probe.home });

  await caller.plugin.activate({ pluginId: 'probe' });

  expect(await probeResult(probe.data)).toEqual({ refused: refusal(reason) });
  expect(await readFile(join(project, 'README.md'), 'utf8')).toBe('original');
  expect(await readFile(join(outside, secretFile), 'utf8')).toBe(secret);
  expect(refusedLines(await pluginLog(probe.home))).toEqual([
    expect.stringMatching(/^.*Plugin probe: refused argo\.fs\./),
  ]);
});
