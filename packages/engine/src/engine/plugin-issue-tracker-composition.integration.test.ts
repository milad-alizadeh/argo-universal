import { chmod, readFile, writeFile } from 'node:fs/promises';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PluginManifest } from '@repo/contracts/plugins';
import { expect, it, onTestFinished, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { scratch } from '#mocks/probe-plugin';
import { refusedLines, runProbe } from '#mocks/probe-run';

const shippedPlugins = fileURLToPath(
  new URL('../../../../plugins', import.meta.url),
);

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
  ).toMatchObject({
    firstParty: true,
    manifest: {
      capabilities: expect.arrayContaining([
        {
          kind: 'process:exec',
          command: 'gh',
          args: ['issue', 'close', '*', '--repo', '*'],
        },
      ]),
    },
  });
  expect(
    await caller.plugins.activate({ pluginId: 'issue-tracker' }),
  ).toMatchObject({ state: 'running', error: null });
});

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
      close: `argo.process.run(['gh', 'issue', 'close', '1', '--repo', 'o/r']).then((r) => r.stdout)`,
      reopen: `argo.process.run(['gh', 'issue', 'reopen', '1', '--repo', 'o/r']).then((r) => r.stdout)`,
    },
    capabilities: manifest.capabilities,
  });

  expect(results).toEqual({
    auth: { value: 'auth status\n' },
    list: {
      value: 'issue list --repo o/r --state open --limit 50 --json number\n',
    },
    view: { value: 'issue view 1 --repo o/r --json title\n' },
    close: { value: 'issue close 1 --repo o/r\n' },
    reopen: { value: 'issue reopen 1 --repo o/r\n' },
  });
  expect(refusedLines(log)).toEqual([]);
});
