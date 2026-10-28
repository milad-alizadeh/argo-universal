import {
  descendantShellStep,
  orphanedShellStep,
  runningShellStep,
} from '@repo/mocks/agent/shell-scenarios';
import { expect, it, assert } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { collectShellOutput } from '#mocks/shell-output';
import { descendantPid, processIsRunning } from '#mocks/shell-process';

it.each([
  { action: 'stop', status: 'stopped' },
  { action: 'close', status: 'lost' },
  { action: 'archive', status: 'stopped' },
  { action: 'exit', status: 'lost' },
] as const)(
  '$action terminates the selected Shell descendants and retains its $status output',
  async ({ action, status }) => {
    const host = await startAcpEngine({ steps: [descendantShellStep] });

    const created = await host.caller.session.new({
      ...emptySessionInput,
      prompt: [{ type: 'text', text: 'Run' }],
    });

    const snapshot = await waitForAcpSnapshot(
      host,
      created.sessionId,
      (value) => value.state === 'idle' && value.shells.length === 1,
    );

    assert(snapshot.shells[0]);
    const shellId = snapshot.shells[0].id;

    const pid = await descendantPid(
      await host.caller.shell.output({ ...created, shellId }),
    );

    expect(processIsRunning(pid)).toBe(true);
    await finishShell(action, host, { ...created, shellId });
    await expect.poll(() => processIsRunning(pid)).toBe(false);
    await expect
      .poll(() => host.caller.session.listShells(created))
      .toMatchObject([{ id: shellId, status, canStop: false, exitCode: null }]);

    const output = await collectShellOutput(
      await host.caller.shell.output({ ...created, shellId }),
    );

    expect(output.map((chunk) => chunk.text).join('')).toBe(
      `descendant:${pid}\n`,
    );
    await expect(
      host.caller.shell.stop({ ...created, shellId }),
    ).rejects.toThrow(/Shell cannot be stopped|No Session/);
    expect(host.agent.processes).toHaveLength(1);
  },
);

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

const finishShell = async (
  action: 'stop' | 'close' | 'archive' | 'exit',
  host: Host,
  input: { sessionId: string; shellId: string },
): Promise<void> => {
  const scope = { sessionId: input.sessionId };

  const actions = {
    stop: async (): Promise<void> => {
      await host.caller.shell.stop(input);
    },
    close: async (): Promise<void> => {
      await host.caller.session.close(scope);
    },
    archive: async (): Promise<void> => {
      await host.caller.session.archive(scope);
    },
    exit: async (): Promise<void> => {
      const process = requireScriptedProcessAt(host.agent.processes);
      process.exited.resolve();
      process.connection.close();
    },
  };

  await actions[action]();
};

it('reaps descendants after their launcher exits without affecting another Shell', async () => {
  const host = await startAcpEngine({
    steps: [orphanedShellStep, runningShellStep],
  });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Run' }],
  });

  const snapshot = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (value) => value.state === 'idle' && value.shells.length === 2,
  );

  const finished = snapshot.shells.find((shell) => shell.status === 'exited');
  const sibling = snapshot.shells.find((shell) => shell.status === 'running');
  assert(finished && sibling);

  const pid = await descendantPid(
    await host.caller.shell.output({ ...created, shellId: finished.id }),
  );

  expect(processIsRunning(pid)).toBe(false);
  expect(finished).toMatchObject({ exitCode: 0, canStop: false });
  expect(sibling.canStop).toBe(true);
  await host.caller.session.close(created);
  const shells = await host.caller.session.listShells(created);

  expect(shells).toHaveLength(2);
  expect(shells).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: finished.id,
        status: 'exited',
        canStop: false,
      }),
      expect.objectContaining({
        id: sibling.id,
        status: 'lost',
        canStop: false,
      }),
    ]),
  );
});
