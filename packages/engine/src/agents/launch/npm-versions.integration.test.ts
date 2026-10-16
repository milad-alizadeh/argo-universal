import { existsSync } from 'node:fs';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installEntry, installationPorts } from '#mocks/installation';
import type { InstallPorts } from '../install/ports';
import { getCommand } from './get-command';
import type { CommandInput } from './types';

const isInstall = (tool: Parameters<InstallPorts['runTool']>[0]): boolean =>
  tool.args[0] === 'install';

type NpmVersions = {
  input: CommandInput;
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

  return {
    installs,
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
      isDirectoryInUse: () => false,
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

it.each([true, false])(
  'installs a newer npm version beside the older one, kept only while a connection uses it (in use: %s)',
  async (inUse) => {
    const versions = await startNpmVersions();
    const older = await getCommand(versions.input);
    older.release();
    await versions.publish('1.2.4');

    const newer = await getCommand({
      ...versions.input,
      isDirectoryInUse: (directory) => inUse && directory === older.directory,
    });

    expect(newer.directory).not.toBe(older.directory);
    expect(versions.installs).toEqual([older.directory, newer.directory]);
    expect(existsSync(older.args[0] ?? '')).toBe(inUse);
  },
);
