import { turn } from '@repo/db/schema';
import { descendantShellStep } from '@repo/mocks/agent/shell-scenarios';
import { eq } from 'drizzle-orm';
import { assert, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import { descendantPid, processIsRunning } from '#mocks/shell-process';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

type CancelledTurn = {
  host: Host;
  sessionId: string;
  shellId: string;
  // The Shell's own descendant, so the check is an OS process, not a report.
  pid: number;
};

/*
 * A Session whose Turn was cancelled while the Shell it started was running.
 * Only a Shell Argo created is Argo's to end; a command the Agent runs inside
 * itself has no ACP method that reaches it (#1337).
 */
const cancelTurnRunningShell = async (): Promise<CancelledTurn> => {
  const host = await startAcpEngine({
    steps: [descendantShellStep, { type: 'wait-for-cancel' }],
  });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Run' }],
  });

  const snapshot = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (value) => value.shells.length === 1,
  );

  assert(snapshot.shells[0]);
  const shellId = snapshot.shells[0].id;

  const pid = await descendantPid(
    await host.caller.shell.output({ ...created, shellId }),
  );

  expect(processIsRunning(pid)).toBe(true);
  await host.caller.session.cancel(created);
  await waitForAcpSessionIdle(host, created.sessionId);

  return { host, sessionId: created.sessionId, shellId, pid };
};

// ADR-0024 settles a cancelled Turn before the Agent answers, so the settlement reports the Turn and never a process.
it('cancelling a Turn ends it while the Shell it started runs on', async () => {
  const { host, sessionId, shellId, pid } = await cancelTurnRunningShell();

  expect({
    turns: host.database
      .select({ status: turn.status, stopReason: turn.stopReason })
      .from(turn)
      .where(eq(turn.sessionId, sessionId))
      .all(),
    running: processIsRunning(pid),
    shells: await host.caller.session.listShells({ sessionId }),
  }).toMatchObject({
    turns: [{ status: 'ended', stopReason: 'cancelled' }],
    running: true,
    shells: [{ id: shellId, status: 'running', canStop: true }],
  });
});

// The Shell a cancelled Turn leaves behind stays the user's to end, as any other running Shell is.
it('stopping a Shell a cancelled Turn left behind ends its process', async () => {
  const { host, sessionId, shellId, pid } = await cancelTurnRunningShell();

  await host.caller.shell.stop({ sessionId, shellId });
  await expect.poll(() => processIsRunning(pid)).toBe(false);
  await expect
    .poll(() => host.caller.session.listShells({ sessionId }))
    .toMatchObject([{ id: shellId, status: 'stopped', canStop: false }]);
});
