import type { TerminalOutputResponse } from '@agentclientprotocol/sdk';
import { blobRef } from '@repo/db/schema';
import {
  exitedShellStep,
  shellScenarios,
} from '@repo/mocks/agent/shell-scenarios';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { collectShellOutput } from '#mocks/shell-output';

it('advertises supported ACP terminals and retains full Blob output while limiting the Agent response at UTF-8 boundaries', async () => {
  const outputs: TerminalOutputResponse[] = [];

  const host = await startAcpEngine({
    steps: [
      {
        ...exitedShellStep,
        request: {
          command: 'node',
          args: ['-e', "process.stdout.write('😀'.repeat(20000))"],
          outputByteLimit: 5,
        },
        outputs,
      },
    ],
  });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Run' }],
  });

  const snapshot = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (value) => value.state === 'idle' && value.shells[0]?.status === 'exited',
  );

  expect(outputs).toMatchObject([
    { output: '😀', truncated: true, exitStatus: { exitCode: 0 } },
  ]);

  const initialize = await requireScriptedProcessAt(
    host.agent.processes,
  ).readRequest();

  expect(initialize.params).toMatchObject({
    clientCapabilities: { terminal: true },
  });
  const shellId = snapshot.shells[0]?.id ?? '';
  const output = await host.caller.shell.output({ ...created, shellId });
  const chunks = await collectShellOutput(output);
  expect(chunks.length).toBeGreaterThan(1);
  expect(chunks.map((chunk) => chunk.text).join('')).toBe('😀'.repeat(20000));
  expect(chunks.at(-1)).toMatchObject({ after: 80000, status: 'exited' });
  expect(host.database.select().from(blobRef).all()).toContainEqual({
    sessionId: created.sessionId,
    blobId: expect.stringMatching(/^[a-f0-9]{64}$/),
  });
});

it('accepts the Agent ACP kill, wait and release sequence without inventing an exit code', async () => {
  const host = await startAcpEngine(shellScenarios['shell-stopped']);
  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Stop' }],
  });
  const snapshot = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (value) => value.state === 'idle' && value.shells[0]?.status === 'stopped',
  );
  expect(snapshot.shells).toMatchObject([
    { status: 'stopped', exitCode: null, canStop: false },
  ]);
});
