import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { defaultInstallPorts } from './default-ports';
import { resolveNode } from './node';

it('concurrent Node probes use separate directories and remove them after exit', async () => {
  const host = await startEngineTestHost();

  const input = {
    database: host.database,
    registry: host.engine.system.get('registry'),
    home: host.home,
    id: 'probe',
    shellEnv: {},
    signal: new AbortController().signal,
    ports: defaultInstallPorts,
    isDirectoryInUse: (): boolean => false,
  };

  const results = await Promise.allSettled(
    Array.from({ length: 4 }, () => resolveNode(input)),
  );

  expect(results.map((result) => result.status)).toEqual(
    Array(4).fill('fulfilled'),
  );
  expect(
    await readdir(join(host.home, 'agents', 'registry', '.probes')),
  ).toEqual([]);
});
