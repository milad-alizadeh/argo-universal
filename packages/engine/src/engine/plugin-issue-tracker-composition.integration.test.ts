import { execFile } from 'node:child_process';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { delimiter, join } from 'node:path';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { PluginManifest } from '@repo/contracts/plugins';
import { expect, it, onTestFinished, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { registeredProject, scratch } from '#mocks/probe-plugin';
import { refusedLines, runProbe } from '#mocks/probe-run';

const shippedPlugins = fileURLToPath(
  new URL('../../../../plugins', import.meta.url),
);

const git = promisify(execFile);

it('loads the shipped Issue tracker with its declared Capabilities and starts it', async () => {
  const { caller } = await startEngineTestHost({
    // The Server's own version, which the shipped Plugins support.
    version: '0.0.0',
    firstPartyPluginsDirectory: shippedPlugins,
  });

  const result = await caller.plugins.list();

  expect(result.errors).toEqual([]);
  expect(
    result.plugins.find(({ manifest }) => manifest.id === 'issue-tracker'),
  ).toMatchObject({ firstParty: true });
  expect(
    await caller.plugins.activate({ pluginId: 'issue-tracker' }),
  ).toMatchObject({ state: 'running', error: null });
});

it('lets a Plugin list Project identities through the logged argo.projects API', async () => {
  const projectPath = await registeredProject();
  const originUrl = 'git@github.com:fixture/issue-tracker.git';

  await git('git', ['-C', projectPath, 'remote', 'add', 'origin', originUrl]);

  const result = await runProbe({
    calls: {
      projects: 'argo.projects.list().then((rows) => JSON.stringify(rows))',
    },
  });

  expectProjectList(result.results.projects, [
    { id: expect.any(String), name: basename(projectPath), originUrl },
  ]);
  expect(result.log).toContain('Plugin probe: argo.projects.list');
});

function expectProjectList(
  projects:
    | Awaited<ReturnType<typeof runProbe>>['results']['projects']
    | undefined,
  expected: { id: unknown; name: string; originUrl: string | null }[],
): void {
  if (!projects) throw new Error('Project list call returned no result');

  if (!('value' in projects)) throw new Error('Project list call failed');

  assertString(projects.value);

  expect(JSON.parse(projects.value)).toEqual(expected);
}

function assertString(value: unknown): asserts value is string {
  if (typeof value !== 'string')
    throw new Error('Project list returned a non-string value');
}

// A `gh` on PATH that prints its arguments: the external CLI the Issue tracker calls.
async function fakeGh(): Promise<void> {
  const bin = await scratch();
  const gh = join(bin, 'gh');

  await writeFile(gh, '#!/bin/sh\necho "$@"\n');
  await chmod(gh, 0o755);
  vi.stubEnv('PATH', `${bin}${delimiter}${process.env.PATH ?? ''}`);
  onTestFinished(() => {
    vi.unstubAllEnvs();
  });
}

it('allows through the checker every gh call the shipped Issue tracker manifest declares', async () => {
  await fakeGh();

  const manifest = PluginManifest.parse(
    JSON.parse(
      await readFile(join(shippedPlugins, 'issue-tracker/plugin.json'), 'utf8'),
    ),
  );

  const { results, log } = await runProbe({
    calls: {
      auth: `argo.process.run(['gh', 'auth', 'status']).then((r) => r.stdout)`,
      list: `argo.process.run(['gh', 'issue', 'list', '--repo', 'o/r', '--state', 'open', '--limit', '50', '--json', 'number']).then((r) => r.stdout)`,
      view: `argo.process.run(['gh', 'issue', 'view', '1', '--repo', 'o/r', '--json', 'title']).then((r) => r.stdout)`,
    },
    capabilities: manifest.capabilities,
  });

  expect(results).toEqual({
    auth: { value: 'auth status\n' },
    list: {
      value: 'issue list --repo o/r --state open --limit 50 --json number\n',
    },
    view: { value: 'issue view 1 --repo o/r --json title\n' },
  });
  expect(refusedLines(log)).toEqual([]);
});
