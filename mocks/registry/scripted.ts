import { gzipSync } from 'node:zlib';
import type { ACPAgent, ACPAgentRegistry } from '@repo/contracts';
import {
  AppFixtureOptions,
  type AppFixtureAgents,
  fixtureAgents,
} from '../agent/app-fixtures';
import type { ScenarioName } from '../agent/scenarios';
import { publishedRegistry } from './catalog';
import { installationExecutableFor } from './installation-packages';

const fixtureUrl = (id: string, scenario: ScenarioName): string =>
  `https://fixtures.argo.test/${id}/${scenario}.gz`;

const target = `${process.platform}-${process.arch === 'arm64' ? 'aarch64' : 'x86_64'}`;

type ScriptedEntry = {
  id: string;
  name: string;
  scenario: ScenarioName;
  env: Record<string, string>;
};

const scriptedEntry = (input: ScriptedEntry): ACPAgent => ({
  id: input.id,
  name: input.name,
  description: 'Scripted ACP Agent',
  version: '1.0.0',
  license_url: 'https://example.org/license',
  distribution: scriptedDistribution(input),
});

const scriptedDistribution = (
  input: ScriptedEntry,
): ACPAgent['distribution'] => ({
  binary: {
    [target]: {
      archive: fixtureUrl(input.id, input.scenario),
      cmd: './agent',
      env: input.env,
    },
  },
});

const fixtureEntries = (
  options: AppFixtureAgents,
  env: Record<string, string>,
): ACPAgent[] =>
  fixtureAgents.map(({ agent, label }) =>
    scriptedEntry({
      id: agent,
      name: label,
      scenario: AppFixtureOptions.parse(options[agent] ?? {}).scenario,
      env,
    }),
  );

const featuredEntries = (env: Record<string, string>): ACPAgent[] =>
  ['github-copilot-cli', 'cursor'].map((id) =>
    scriptedEntry({
      id,
      name: id === 'cursor' ? 'Cursor' : 'Copilot',
      scenario: 'reply',
      env,
    }),
  );

const failedDownload = scriptedEntry({
  id: 'download-failure',
  name: 'Failed Download',
  scenario: 'reply',
  env: {},
});

export const scriptedRegistry = (
  options: AppFixtureAgents = {},
  env: Record<string, string> = {},
): ACPAgentRegistry => ({
  ...publishedRegistry,
  agents: [
    ...fixtureEntries(options, env),
    ...featuredEntries(env),
    ...publishedRegistry.agents,
    failedDownload,
  ],
});

export const scriptedDownloads = (
  options: AppFixtureAgents = {},
): Record<string, Uint8Array | Error> =>
  Object.fromEntries([
    ...fixtureAgents.map(({ agent }) =>
      download(agent, AppFixtureOptions.parse(options[agent] ?? {}).scenario),
    ),
    ...['github-copilot-cli', 'cursor'].map((id) => download(id, 'reply')),
    [
      fixtureUrl('download-failure', 'reply'),
      new Error('Fixture download failed'),
    ],
  ]);

const download = (id: string, scenario: ScenarioName): [string, Uint8Array] => [
  fixtureUrl(id, scenario),
  gzipSync(installationExecutableFor(scenario)),
];
