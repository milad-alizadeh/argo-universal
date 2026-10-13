import type { ACPAgent } from '@repo/contracts';
import { expect } from 'vitest';
import type { InstallPorts } from '../src/agents';
import { startEngineTestHost } from './engine';

export { installationExecutable } from '@repo/mocks/registry/installation';

import { createInstallationPorts } from '@repo/mocks/registry/installation';

const fixturePackage = 'fixture-install';

export const installEntry = (kind: 'binary' | 'npx' | 'uvx'): ACPAgent => ({
  id: fixturePackage,
  name: 'Fixture ACP',
  version: '1.2.3',
  description: 'An external installer fixture',
  license_url: 'https://example.org/license',
  distribution:
    kind === 'binary'
      ? {
          binary: {
            [process.platform === 'win32'
              ? 'windows-x86_64'
              : `${process.platform}-${process.arch === 'arm64' ? 'aarch64' : 'x86_64'}`]:
              { archive: 'https://example.org/agent', cmd: './agent' },
          },
        }
      : {
          [kind]: {
            package:
              kind === 'npx'
                ? 'fixture-install@1.2.3'
                : 'fixture-install==1.2.3',
          },
        },
});

export const installationPorts: InstallPorts = createInstallationPorts();

export const startInstallEngine = async (
  entry = installEntry('npx'),
  ports = installationPorts,
): Promise<
  Awaited<ReturnType<typeof startEngineTestHost>> & { agentId: string }
> => {
  const host = await startEngineTestHost({
    installationPorts: ports,
    fetchAgents: async () =>
      JSON.stringify({ version: '1.0.0', agents: [entry] }),
  });

  await host.caller.agents.syncCatalog();
  await expect
    .poll(async () => (await host.caller.agents.catalog()).syncStatus)
    .toBe('idle');

  const agent = (await host.caller.agents.catalog()).agents.find(
    (row) => row.entry.id === entry.id,
  );

  if (!agent) throw new Error('Catalog did not contain installation fixture');

  return { ...host, agentId: agent.id };
};
