import type { ACPAgent, AgentInfo } from '@repo/contracts';
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

export const pathEntrypoint = 'fixture-acp-agent';

// A binary Registry entry whose entrypoint has the same file name on every platform, so the Resolver can find it on PATH.
export const pathBinaryEntry = (): ACPAgent => {
  const entry = installEntry('binary');
  const targets = Object.entries(entry.distribution.binary ?? {});

  return {
    ...entry,
    distribution: {
      binary: Object.fromEntries(
        targets.map(([platform, target]) => [
          platform,
          { ...target, cmd: `./${pathEntrypoint}`, args: ['acp'] },
        ]),
      ),
    },
  };
};

export const installationPorts: InstallPorts = createInstallationPorts();

export const startInstallEngine = async (
  entry = installEntry('npx'),
  ports = installationPorts,
  options: Parameters<typeof startEngineTestHost>[0] = {},
): Promise<
  Awaited<ReturnType<typeof startEngineTestHost>> & { agentId: string }
> => {
  const host = await startEngineTestHost({
    ...options,
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

type Caller = Awaited<ReturnType<typeof startEngineTestHost>>['caller'];

// The Agent's row as the Agents page lists it.
export const listedAgent = async (
  caller: Caller,
  agentId: string,
): Promise<AgentInfo | undefined> =>
  (await caller.agents.list()).find(({ agent }) => agent === agentId);
