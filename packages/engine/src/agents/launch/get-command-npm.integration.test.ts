import { existsSync } from 'node:fs';
import { chmod } from 'node:fs/promises';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installEntry, installationPorts } from '#mocks/installation';
import type { InstallPorts } from '../install/ports';
import { getCommand } from './get-command';
import type { CommandInput } from './types';

const isInstall = (tool: Parameters<InstallPorts['runTool']>[0]): boolean =>
  tool.args[0] === 'install';

const startNpmHost = async (
  runTool: InstallPorts['runTool'],
): Promise<CommandInput> => {
  const entry = installEntry('npx');

  const host = await startEngineTestHost({
    fetchAgents: async () =>
      JSON.stringify({ version: '1.0.0', agents: [entry] }),
  });

  return {
    database: host.database,
    registry: host.engine.system.get('registry'),
    home: host.home,
    id: entry.id,
    shellEnv: {},
    ports: { ...installationPorts, runTool },
    signal: new AbortController().signal,
    isDirectoryInUse:
      host.engine.getSnapshot().context.acpResources.isDirectoryInUse,
  };
};

it('installs npm again for a new connection', async () => {
  const runTool = vi.fn<InstallPorts['runTool']>(installationPorts.runTool);
  const input = await startNpmHost(runTool);
  await getCommand(input);
  await getCommand(input);
  expect(runTool.mock.calls.filter(([tool]) => isInstall(tool))).toHaveLength(
    2,
  );
});

it('launches a non-executable npm entry point through Node', async () => {
  const input = await startNpmHost(async (tool) => {
    const output = await installationPorts.runTool(tool);

    if (isInstall(tool))
      await chmod(`${tool.cwd}/node_modules/fixture-install/agent.mjs`, 0o644);

    return output;
  });

  const command = await getCommand(input);
  expect(command.args[0]).toMatch(
    /\/node_modules\/fixture-install\/agent.mjs$/,
  );
});

const firstCallerLeft = 'first caller left';

type HeldInstall = {
  runTool: InstallPorts['runTool'];
  started: Promise<AbortSignal>;
  resume: () => void;
  installs: () => number;
};

// Holds `npm install` until resumed; the caller whose signal is `later` probes only once the install has started.
const holdInstall = (later: AbortSignal): HeldInstall => {
  const started = Promise.withResolvers<AbortSignal>();
  const resume = Promise.withResolvers<void>();
  let installs = 0;

  return {
    started: started.promise,
    resume: () => resume.resolve(),
    installs: () => installs,
    runTool: async (tool) => {
      if (isInstall(tool)) {
        installs += 1;
        started.resolve(tool.signal);
        await resume.promise;
      } else if (tool.signal === later) await started.promise;

      return installationPorts.runTool(tool);
    },
  };
};

type SharedInstall = {
  held: HeldInstall;
  first: Promise<Awaited<ReturnType<typeof getCommand>>>;
  second: Promise<Awaited<ReturnType<typeof getCommand>>>;
  callers: AbortController[];
  installSignal: AbortSignal;
};

// The first caller starts the install; the second joins it before anyone aborts.
const shareInstall = async (): Promise<SharedInstall> => {
  const callers = [new AbortController(), new AbortController()];
  const [starter, joiner] = callers.map(({ signal }) => signal);

  if (!starter || !joiner) throw new Error('Callers are missing');
  const held = holdInstall(joiner);
  const input = await startNpmHost(held.runTool);
  const joined = vi.spyOn(joiner, 'addEventListener');
  const first = getCommand({ ...input, signal: starter });
  const second = getCommand({ ...input, signal: joiner });
  const installSignal = await held.started;
  // The joiner listens once for its version reservation, then once more when it joins the install.
  await vi.waitFor(() =>
    expect(joined).toHaveBeenNthCalledWith(2, 'abort', expect.any(Function), {
      once: true,
    }),
  );

  return { held, first, second, callers, installSignal };
};

it('rejects an aborted caller of a shared npm install with its own reason', async () => {
  const shared = await shareInstall();
  shared.callers[0]?.abort(new Error(firstCallerLeft));
  await expect(shared.first).rejects.toThrow(firstCallerLeft);
  shared.held.resume();
  await shared.second;
});

it('keeps a shared npm install for the caller that stays after the first aborts', async () => {
  const shared = await shareInstall();
  shared.callers[0]?.abort(new Error(firstCallerLeft));
  await shared.first.catch(() => {});
  shared.held.resume();
  const command = await shared.second;
  expect(existsSync(command.args[0] ?? '')).toBe(true);
  expect(shared.installSignal.aborted).toBe(false);
  expect(shared.held.installs()).toBe(1);
});

it('aborts a shared npm install once every caller aborts', async () => {
  const shared = await shareInstall();

  for (const caller of shared.callers) caller.abort(new Error('caller left'));
  await Promise.allSettled([shared.first, shared.second]);
  expect(shared.installSignal.aborted).toBe(true);
  shared.held.resume();
});
