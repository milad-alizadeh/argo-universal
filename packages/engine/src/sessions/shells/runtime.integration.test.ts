import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CloseSessionRequest } from '@agentclientprotocol/sdk';
import { shell } from '@repo/db/schema';
import {
  shellScenarios,
  runningShellStep,
} from '@repo/mocks/agent/shell-scenarios';
import { expect, it, assert } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';

it('stores an exited ACP Shell and its complete output as a referenced Blob', async () => {
  const host = await startAcpEngine(shellScenarios['shell-exited']);

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Run' }],
  });

  const snapshot = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (value) => value.state === 'idle' && value.shells[0]?.status === 'exited',
  );

  expect(snapshot.shells).toMatchObject([
    {
      toolCallId: 'finite-command',
      status: 'exited',
      exitCode: 7,
      canStop: false,
    },
  ]);
  expect(await host.caller.session.listShells(created)).toMatchObject(
    snapshot.shells.map(({ durationMs: _duration, ...record }) => record),
  );
  const record = host.database.select().from(shell).get();
  assert(record?.outputBlobId);
  expect(record.outputBlobId).toMatch(/^[a-f0-9]{64}$/);
  expect(
    await readFile(join(host.blobsFolder, record.outputBlobId), 'utf8'),
  ).toBe('done\n');
  assert(snapshot.shells[0]);

  const output = await host.caller.shell.output({
    ...created,
    shellId: snapshot.shells[0].id,
  });

  const chunks = [];

  for await (const chunk of output) chunks.push(chunk);
  expect(chunks).toEqual([{ text: 'done\n', after: 5, status: 'exited' }]);
});

it('keeps Shells running beyond their Turn and stops only the selected Shell', async () => {
  const host = await startAcpEngine({
    steps: [
      runningShellStep,
      { ...runningShellStep, toolCallId: 'other-command' },
    ],
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

  const selected = snapshot.shells[0]?.id ?? '';

  expect(snapshot.shells).toMatchObject([
    { status: 'running', canStop: true },
    { status: 'running', canStop: true },
  ]);
  expect(
    (await host.caller.session.list({ archived: false })).sessions,
  ).toMatchObject([{ shells: { total: 2, running: 2 } }]);
  await host.caller.shell.stop({ ...created, shellId: selected });

  const stopped = await waitForAcpSnapshot(host, created.sessionId, (value) =>
    value.shells.some(
      (record) => record.id === selected && record.status === 'stopped',
    ),
  );

  expect(stopped.state).toBe('idle');
  expect(
    (await host.caller.session.list({ archived: false })).sessions,
  ).toMatchObject([{ shells: { total: 2, running: 1 } }]);
  expect(stopped.shells.find((record) => record.id !== selected)).toMatchObject(
    { status: 'running', canStop: true },
  );
  await expect(
    host.caller.shell.stop({ ...created, shellId: selected }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
  await host.caller.session.close(created);
});

it('records its Shells before asking the Agent to close the Session, past the close deadline', async () => {
  const received = Promise.withResolvers<CloseSessionRequest>();

  const host = await startAcpEngine({
    steps: [runningShellStep],
    closeTimeoutMs: 1,
    responses: { 'session/close': [{ received, steps: [{ type: 'hold' }] }] },
  });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Run' }],
  });

  await waitForAcpSnapshot(
    host,
    created.sessionId,
    (value) => value.state === 'idle' && value.shells.length === 1,
  );
  const closing = host.caller.session.close(created);
  await received.promise;

  expect(host.database.select().from(shell).get()).toMatchObject({
    status: 'lost',
    outputBlobId: expect.any(String),
  });
  await expect(closing).resolves.toEqual({});
});
