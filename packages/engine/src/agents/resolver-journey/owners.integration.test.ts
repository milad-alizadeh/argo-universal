import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it } from 'vitest';
import {
  listedAgent,
  pathBinaryEntry,
  pathEntrypoint,
  pathNpmCommand,
  pathNpmEntry,
  startInstallEngine,
} from '#mocks/installation';
import { createMachinePath, type MachinePath } from '#mocks/machine-path';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

const catalogVersion = '1.2.3';

const owned = [
  {
    owner: 'homebrew',
    copy: 'a command in a Homebrew Cellar',
    entry: pathBinaryEntry(),
    place: (machine: MachinePath): Promise<string> =>
      machine.placeFormula(pathEntrypoint, {
        name: 'fixture-formula',
        version: catalogVersion,
      }),
  },
  {
    owner: 'npm',
    copy: "a command in npm's global packages",
    entry: pathNpmEntry(),
    place: (machine: MachinePath): Promise<string> =>
      machine.placePackage(pathNpmCommand, {
        name: 'fixture-install',
        version: catalogVersion,
      }),
  },
  {
    owner: 'unknown',
    copy: 'a command anywhere else',
    entry: pathBinaryEntry(),
    place: (machine: MachinePath): Promise<string> =>
      machine.place(pathEntrypoint),
  },
];

it.each(owned)(
  'the owner of $copy is $owner, read from where the file really is, beside the path the user updates it at',
  async ({ owner, entry, place }) => {
    const machine = await createMachinePath();
    const path = await place(machine);

    const host = await startInstallEngine(entry, undefined, {
      fixtureAgents: [],
      acp: createScriptedAgentProcess(scenarios.reply),
    });

    await expect
      .poll(() => listedAgent(host.caller, host.agentId))
      .toMatchObject({ status: 'ready', owner, path });
  },
  30_000,
);

const olderRelease = '1.2.0';

const outdated = [
  {
    copy: 'a Homebrew formula',
    entry: pathBinaryEntry(),
    place: (machine: MachinePath): Promise<string> =>
      machine.placeFormula(pathEntrypoint, {
        name: 'fixture-formula',
        version: olderRelease,
      }),
    listed: {
      owner: 'homebrew',
      version: olderRelease,
      updateCommand: 'brew upgrade fixture-formula',
    },
  },
  {
    copy: 'an npm global package',
    entry: pathNpmEntry(),
    place: (machine: MachinePath): Promise<string> =>
      machine.placePackage(pathNpmCommand, {
        name: 'fixture-install',
        version: olderRelease,
      }),
    listed: {
      owner: 'npm',
      version: olderRelease,
      updateCommand: `npm install -g fixture-install@${catalogVersion}`,
    },
  },
];

it.each(outdated)(
  'an outdated copy of $copy names the command that updates it',
  async ({ entry, place, listed }) => {
    const machine = await createMachinePath();
    await place(machine);

    const host = await startInstallEngine(entry, undefined, {
      fixtureAgents: [],
      acp: createScriptedAgentProcess(scenarios['agent-info']),
    });

    await expect
      .poll(() => listedAgent(host.caller, host.agentId))
      .toMatchObject({ status: 'update-available', ...listed });
  },
  30_000,
);

it.each([
  {
    copy: 'a binary',
    entry: pathBinaryEntry(),
    command: pathEntrypoint,
  },
  {
    copy: 'an npm Agent',
    entry: pathNpmEntry(),
    command: pathNpmCommand,
  },
])(
  'an outdated $copy from an unknown installer names no command, since nothing says how it was installed',
  async ({ entry, command }) => {
    const machine = await createMachinePath();
    await machine.place(command);

    const host = await startInstallEngine(entry, undefined, {
      fixtureAgents: [],
      acp: createScriptedAgentProcess(scenarios['agent-info']),
    });

    await expect
      .poll(() => listedAgent(host.caller, host.agentId))
      .toMatchObject({ status: 'update-available', owner: 'unknown' });
    expect(await listedAgent(host.caller, host.agentId)).not.toHaveProperty(
      'updateCommand',
    );
  },
  30_000,
);
