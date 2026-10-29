import { symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { localhost, redirectTo, serving } from '#mocks/fetch-fixture-server';
import { installed, probeResult, probeSource } from '#mocks/probe-plugin';
import { pluginLog, refusedLines, runProbe } from '#mocks/probe-run';

it.each([
  {
    name: 'an undeclared host',
    url: (): string => 'https://example.com/private?token=synthetic',
    reason: 'not a declared host',
  },
  {
    name: 'a redirect outside the allowed hosts',
    url: (port: number): string => redirectTo(port, 'https://example.com/'),
    reason: 'not a declared host',
  },
  {
    name: 'plain HTTP',
    url: (port: number): string => `http://localhost:${port}/`,
    reason: 'not HTTPS',
  },
  {
    name: 'DNS rebinding',
    url: (port: number): string => `https://api.fixture.test:${port}/`,
    reason: 'private address',
  },
])(
  'refuses $name and logs the Plugin without credentials',
  async ({ url, reason }) => {
    const port = await serving();

    const { results, log } = await runProbe({
      calls: {
        image: `argo.assets.resolve({ url: ${JSON.stringify(url(port))}, headers: { Authorization: 'Bearer synthetic' } })`,
      },
      capabilities: [
        localhost(port),
        { kind: 'fetch', host: `api.fixture.test:${port}` },
      ],
      network: true,
    });

    expect(results).toEqual({
      image: { error: expect.stringContaining(reason) },
    });
    expect(refusedLines(log)).toEqual([
      expect.stringContaining('Plugin probe: refused argo.assets.resolve'),
    ]);
    expect(log).not.toContain('synthetic');
  },
);

it('refuses traversal, absolute paths and symlinks outside the Plugin folder', async () => {
  const probe = await installed(
    probeSource({
      traversal: "argo.assets.resolve({ asset: '../private.png' })",
      absolute: "argo.assets.resolve({ asset: '$CODE/../private.png' })",
      symlink: "argo.assets.resolve({ asset: 'linked.png' })",
    }),
  );

  await writeFile(join(probe.code, '../private.png'), 'private bytes');
  await symlink(
    join(probe.code, '../private.png'),
    join(probe.code, 'linked.png'),
  );
  const { caller } = await startEngineTestHost({ home: probe.home });
  await caller.plugin.activate({ pluginId: 'probe' });

  const refused = { error: expect.stringMatching(/^Refused: /) };
  expect(await probeResult(probe.data)).toEqual({
    traversal: refused,
    absolute: refused,
    symlink: refused,
  });
  expect(refusedLines(await pluginLog(probe.home))).toHaveLength(3);
});
