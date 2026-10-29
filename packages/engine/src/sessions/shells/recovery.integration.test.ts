import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { shell } from '@repo/db/schema';
import { runningShellStep } from '@repo/mocks/agent/shell-scenarios';
import { expect, it, assert } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { startEngineTestHost } from '#mocks/engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { collectShellOutput, readShellOutputUntil } from '#mocks/shell-output';
import { shellOutputPath, createShellOutput } from './files';

it('an Agent exit loses running Shells, retains output and never restarts commands', async () => {
  const host = await startAcpEngine({ steps: [runningShellStep] });

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
  const output = await host.caller.shell.output({ ...created, shellId });

  expect((await readShellOutputUntil(output, 'ready\n')).text).toBe('ready\n');
  const process = requireScriptedProcessAt(host.agent.processes);
  process.exited.resolve();
  process.connection.close();
  await expect
    .poll(() => host.caller.session.listShells(created))
    .toMatchObject([
      { id: shellId, status: 'lost', exitCode: null, canStop: false },
    ]);
  const record = host.database.select().from(shell).get();
  assert(record?.outputBlobId);
  expect(
    await readFile(join(host.blobsFolder, record.outputBlobId), 'utf8'),
  ).toBe('ready\n');
  expect(host.agent.processes).toHaveLength(1);
});

it('Engine startup loses interrupted Shells before serving, retains files as Blobs and leaves ended Shells unchanged', async () => {
  const host = await startAcpEngine({ steps: [] });
  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Keep' }],
  });
  await waitForAcpSnapshot(
    host,
    created.sessionId,
    (value) => value.state === 'idle',
  );
  const startedAt = Date.now() - 1000;
  host.database
    .insert(shell)
    .values([
      {
        ...created,
        id: 'interrupted',
        toolCallId: 'tool',
        command: 'fixture',
        cwd: host.home,
        startedAt,
        status: 'running',
      },
      {
        ...created,
        id: 'finished',
        toolCallId: 'other',
        command: 'fixture',
        cwd: host.home,
        startedAt,
        endedAt: startedAt + 1,
        status: 'exited',
        exitCode: 0,
      },
    ])
    .run();
  const path = shellOutputPath(host.home, created.sessionId, 'interrupted');
  await createShellOutput(path);
  await writeFile(path, 'stored before interruption\n');
  await writeFile(join(host.home, 'shells', 'unassociated-output'), 'orphan');
  await host.stop();

  const restarted = await startEngineTestHost({
    home: host.home,
    acp: host.agent,
  });

  expect(await restarted.caller.session.listShells(created)).toMatchObject([
    {
      id: 'finished',
      status: 'exited',
      exitCode: 0,
      endedAt: startedAt + 1,
      canStop: false,
    },
    { id: 'interrupted', status: 'lost', exitCode: null, canStop: false },
  ]);

  const output = await restarted.caller.shell.output({
    ...created,
    shellId: 'interrupted',
  });

  const chunks = await collectShellOutput(output);
  expect(chunks).toEqual([
    { text: 'stored before interruption\n', after: 27, status: 'lost' },
  ]);
  expect(await readdir(join(host.home, 'shells'))).toEqual([]);
  expect(host.agent.processes).toHaveLength(1);
});
