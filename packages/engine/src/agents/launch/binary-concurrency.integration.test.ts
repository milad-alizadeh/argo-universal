import { existsSync } from 'node:fs';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installEntry, installationPorts } from '#mocks/installation';
import { getCommand } from './get-command';

it('keeps concurrently resolved versions usable until their commands are released', async () => {
  let entry = installEntry('binary');

  const host = await startEngineTestHost({
    fetchAgents: async () =>
      JSON.stringify({ version: '1.0.0', agents: [entry] }),
  });

  await host.caller.registry.refresh();
  const started = Promise.withResolvers<void>();
  const resume = Promise.withResolvers<void>();
  let downloads = 0;

  const input = {
    database: host.database,
    registry: host.engine.system.get('registry'),
    home: host.home,
    id: entry.id,
    shellEnv: {},
    signal: new AbortController().signal,
    isDirectoryInUse:
      host.engine.getSnapshot().context.acpResources.isDirectoryInUse,
    ports: {
      ...installationPorts,
      download: async (
        url: string,
        signal: AbortSignal,
      ): Promise<Uint8Array> => {
        if (++downloads === 1) {
          started.resolve();
          await resume.promise;
        }

        return installationPorts.download(url, signal);
      },
    },
  };

  const old = getCommand(input);
  await started.promise;
  entry = { ...entry, version: '2.0.0' };
  await host.caller.registry.refresh();
  const newer = getCommand(input);
  resume.resolve();
  const commands = await Promise.all([old, newer]);
  expect(commands.map((command) => existsSync(command.executable))).toEqual([
    true,
    true,
  ]);

  for (const command of commands) command.release();
  const latest = await getCommand(input);
  const [previous] = commands;

  if (!previous) throw new Error('Previous command is missing');
  expect(existsSync(previous.executable)).toBe(false);
  expect(existsSync(latest.executable)).toBe(true);
  latest.release();
});
