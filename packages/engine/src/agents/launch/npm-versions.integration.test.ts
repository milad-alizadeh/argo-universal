import { existsSync } from 'node:fs';
import { expect, it } from 'vitest';
import {
  createResourceOpening,
  deferLaunch,
  resourceLaunch,
} from '#mocks/acp-resource';
import { startEngineTestHost } from '#mocks/engine';
import { installEntry, installationPorts } from '#mocks/installation';
import type { AcpResources } from '../index';
import { getCommand } from './get-command';
import type { InstallPorts } from './ports';
import type { CommandInput, RegistryCommand } from './types';

const isInstall = (tool: Parameters<InstallPorts['runTool']>[0]): boolean =>
  tool.args[0] === 'install';

type NpmVersions = {
  input: CommandInput;
  resources: AcpResources;
  installs: string[];
  publish: (version: string) => Promise<void>;
};

// The Registry serves the npm fixture at a version the test publishes; `installs` lists each npm install folder.
const startNpmVersions = async (): Promise<NpmVersions> => {
  const installs: string[] = [];
  let entry = installEntry('npx');

  const host = await startEngineTestHost({
    fetchAgents: async () =>
      JSON.stringify({ version: '1.0.0', agents: [entry] }),
  });

  const resources = host.engine.getSnapshot().context.acpResources;

  return {
    installs,
    resources,
    input: {
      database: host.database,
      registry: host.engine.system.get('registry'),
      home: host.home,
      id: entry.id,
      shellEnv: {},
      ports: {
        ...installationPorts,
        runTool: async (tool) => {
          if (isInstall(tool)) installs.push(tool.cwd);

          return installationPorts.runTool(tool);
        },
      },
      signal: new AbortController().signal,
      isDirectoryInUse: resources.isDirectoryInUse,
    },
    publish: async (version) => {
      entry = {
        ...entry,
        version,
        distribution: { npx: { package: `fixture-install@${version}` } },
      };
      await host.caller.agents.refreshRegistry();
    },
  };
};

// A live connection on the older version, whose entry was dropped so the next open starts a new one.
const holdConnection = async (
  versions: NpmVersions,
  older: RegistryCommand,
): Promise<void> => {
  await versions.resources.open({
    ...createResourceOpening(),
    launch: deferLaunch({
      ...resourceLaunch,
      agentId: versions.input.id,
      installationDirectory: older.directory,
    }),
  });
  versions.resources.dropAgentConnections(versions.input.id);
};

it.each([
  { held: true, olderKept: true },
  { held: false, olderKept: false },
])(
  'installs a newer npm version beside the older one, kept only while a connection uses it (held: $held)',
  async ({ held, olderKept }) => {
    const versions = await startNpmVersions();
    const older = await getCommand(versions.input);

    if (held) await holdConnection(versions, older);
    older.release();
    await versions.publish('1.2.4');

    const newer = await getCommand(versions.input);
    newer.release();

    expect(newer.directory).not.toBe(older.directory);
    expect(versions.installs).toHaveLength(2);
    expect(existsSync(older.args[0] ?? '')).toBe(olderKept);
  },
);
