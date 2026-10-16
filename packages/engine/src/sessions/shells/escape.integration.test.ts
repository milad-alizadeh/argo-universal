import { escapedShellStep } from '@repo/mocks/agent/shell-scenarios';
import { assert, expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { descendantPid, processIsRunning } from '#mocks/shell-process';

it('closes a Shell whose descendant left its group and holds its output open', async () => {
  const host = await startAcpEngine({ steps: [escapedShellStep] });

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

  onTestFinished(() => {
    if (processIsRunning(pid)) process.kill(pid, 'SIGKILL');
  });
  await host.caller.session.close(created);

  expect(await host.caller.session.shells(created)).toMatchObject([
    { id: shellId, status: 'lost', canStop: false },
  ]);
  expect(processIsRunning(pid)).toBe(true);
});
