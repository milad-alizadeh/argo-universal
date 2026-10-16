import { writeFile, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  streamingShellStep,
  runningShellStep,
} from '@repo/mocks/agent/shell-scenarios';
import { expect, it, assert } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { collectShellOutput, readShellOutputUntil } from '#mocks/shell-output';

it('streams stored output before new stdout/stderr and resumes at a UTF-8 byte offset', async () => {
  const host = await startAcpEngine({ steps: [] });
  const gate = join(host.home, 'shell-gate');
  const created = await host.caller.session.new(emptySessionInput);
  await requireScriptedProcessAt(host.agent.processes).play(
    [
      {
        ...streamingShellStep,
        request: {
          ...streamingShellStep.request,
          env: [{ name: 'ARGO_SHELL_GATE', value: gate }],
        },
      },
    ],
    'owned-1',
  );

  const snapshot = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (value) => value.shells.length === 1,
  );

  assert(snapshot.shells[0]);
  const shellId = snapshot.shells[0].id;
  const output = await host.caller.shell.output({ ...created, shellId });
  const storedOutput = await readShellOutputUntil(output, 'α ready\n');
  expect(storedOutput.text).toBe('α ready\n');
  const after = storedOutput.after;
  expect(after).toBe(9);

  const stored = host.database.$client
    .prepare('SELECT output_blob_id FROM shell WHERE session_id = ? AND id = ?')
    .get(created.sessionId, shellId);

  expect(stored).toEqual({ output_blob_id: null });
  const names = await readdir(join(host.home, 'shells'));
  assert(names[0]);
  expect(await readFile(join(host.home, 'shells', names[0]), 'utf8')).toBe(
    'α ready\n',
  );

  const resumed = await host.caller.shell.output({
    ...created,
    shellId,
    after,
  });

  expect((await resumed[Symbol.asyncIterator]().next()).value).toEqual({
    text: '',
    after: 9,
    status: 'running',
  });
  const tailPromise = collectShellOutput(resumed);
  await writeFile(gate, 'continue');
  const tail = await tailPromise;
  expect(tail.map((chunk) => chunk.text).join('')).toBe('ω done\n');
  expect(tail.at(-1)).toMatchObject({ after: 17, status: 'exited' });
  await expect(
    host.caller.session.stopShell({ ...created, shellId }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
});

it('rejects output and Stop for a Shell belonging to another Session', async () => {
  const host = await startAcpEngine({ steps: [runningShellStep] });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Run' }],
  });

  const other = await host.caller.session.new(emptySessionInput);

  const snapshot = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (value) => value.shells.length === 1,
  );

  assert(snapshot.shells[0]);
  const shellId = snapshot.shells[0].id;
  const output = await host.caller.shell.output({ ...other, shellId });
  await expect(output[Symbol.asyncIterator]().next()).rejects.toMatchObject({
    code: 'NOT_FOUND',
  });
  await expect(
    host.caller.session.stopShell({ ...other, shellId }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  await host.caller.session.close(created);
});
