import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PluginCapability } from '@repo/contracts/plugins';
import { expect } from 'vitest';
import { startEngineTestHost } from './engine';
import {
  fixtureNetwork,
  installed,
  probeResult,
  probeSource,
} from './probe-plugin';

type Run = {
  calls: Record<string, string>;
  capabilities?: PluginCapability[];
  network?: boolean;
};

type Ran = {
  results: Awaited<ReturnType<typeof probeResult>>;
  log: string;
  data: string;
  code: string;
};

export const pluginLog = (home: string): Promise<string> =>
  readFile(join(home, 'logs/plugins.log'), 'utf8');

// Activates a first-party probe that makes the calls, and answers what each returned and the log.
export async function runProbe({
  calls,
  capabilities,
  network,
}: Run): Promise<Ran> {
  const probe = await installed(probeSource(calls), { capabilities });
  const pluginNetwork = network ? await fixtureNetwork() : undefined;

  await activateProbe(probe.home, pluginNetwork);

  return {
    results: await probeResult(probe.data),
    log: await pluginLog(probe.home),
    data: probe.data,
    code: probe.code,
  };
}

const activateProbe = async (
  home: string,
  pluginNetwork: NonNullable<
    Parameters<typeof startEngineTestHost>[0]
  >['pluginNetwork'],
): Promise<void> => {
  const { caller } = await startEngineTestHost({ home, pluginNetwork });
  await caller.plugin.activate({ pluginId: 'probe' });
};

// The log lines that record a refusal; each refused call writes exactly one.
export const refusedLines = (log: string): string[] =>
  log.split('\n').filter((line) => line.includes(': refused '));

type Refused = { error: string };

// What a refused call answers the Plugin: an error naming the reason.
export const refusal = (reason: string): Refused => ({
  error: expect.stringMatching(new RegExp(`^Refused: .*${reason}`)),
});
