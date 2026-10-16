import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { shell } from '@repo/db/schema';
import { streamingShellStep } from '@repo/mocks/agent/shell-scenarios';
import { assert, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { startEngineTestHost } from '#mocks/engine';
import { collectShellOutput } from '#mocks/shell-output';
import { createShellOutput, shellOutputPath } from './files';

const runExitedCommand = async (
  script: string,
): Promise<{
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  scope: { sessionId: string; shellId: string };
}> => {
  const host = await startAcpEngine({
    steps: [
      {
        ...streamingShellStep,
        request: { command: process.execPath, args: ['-e', script] },
        completion: 'wait-for-exit',
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

  const shellId = snapshot.shells[0]?.id;
  assert(shellId);

  return { host, scope: { ...created, shellId } };
};

it('resumes across a read boundary inside a UTF-8 character without losing its bytes', async () => {
  const { host, scope } = await runExitedCommand(
    "process.stdout.write('a'.repeat(65535)+'😀Z')",
  );

  const chunks = await collectShellOutput(
    await host.caller.shell.output(scope),
  );

  expect(chunks).toEqual([
    { text: 'a'.repeat(65535), after: 65535, status: 'exited' },
    { text: '😀Z', after: 65540, status: 'exited' },
  ]);
  expect(
    await collectShellOutput(
      await host.caller.shell.output({ ...scope, after: 65535 }),
    ),
  ).toEqual([{ text: '😀Z', after: 65540, status: 'exited' }]);
});

it('keeps invalid UTF-8 bytes from captured output intact in its Blob', async () => {
  const { host, scope } = await runExitedCommand(
    'process.stdout.write(Buffer.from([0xff, 0xfe, 0x41]))',
  );

  const record = host.database.select().from(shell).get();
  assert(record?.outputBlobId);
  expect(await readFile(join(host.blobsFolder, record.outputBlobId))).toEqual(
    Buffer.from([0xff, 0xfe, 0x41]),
  );
  expect(
    await collectShellOutput(await host.caller.shell.output(scope)),
  ).toEqual([{ text: '\uFFFD\uFFFDA', after: 3, status: 'exited' }]);
});

it.each([
  { bytes: [0x41, 0xf0, 0x9f], text: 'A�', after: 3 },
  { bytes: [0xe2], text: '�', after: 1 },
  { bytes: [0xff, 0x41], text: '�A', after: 2 },
])(
  'completes recovered output at its source byte cursor for $bytes',
  async ({ bytes, text, after }) => {
    const host = await startAcpEngine({ steps: [] });

    const created = await host.caller.session.new({
      ...emptySessionInput,
      prompt: [{ type: 'text', text: 'Keep' }],
    });

    await waitForAcpSnapshot(
      host,
      created.sessionId,
      (value) => value.state === 'idle',
    );
    host.database
      .insert(shell)
      .values({
        ...created,
        id: 'partial',
        toolCallId: 'tool',
        command: 'fixture',
        cwd: host.home,
        status: 'running',
        startedAt: Date.now(),
      })
      .run();
    const path = shellOutputPath(host.home, created.sessionId, 'partial');
    await createShellOutput(path);
    await writeFile(path, Buffer.from(bytes));
    await host.stop();

    const restarted = await startEngineTestHost({
      home: host.home,
      acp: host.agent,
    });

    const scope = { ...created, shellId: 'partial' };

    const stream = (await restarted.caller.shell.output(scope))[
      Symbol.asyncIterator
    ]();

    expect(await stream.next()).toEqual({
      done: false,
      value: { text, after, status: 'lost' },
    });
    expect(await stream.next()).toEqual({ done: true, value: undefined });
    const record = restarted.database.select().from(shell).get();
    assert(record?.outputBlobId);
    expect(
      await readFile(join(restarted.blobsFolder, record.outputBlobId)),
    ).toEqual(Buffer.from(bytes));
    expect(
      await collectShellOutput(
        await restarted.caller.shell.output({ ...scope, after }),
      ),
    ).toEqual([{ text: '', after, status: 'lost' }]);
  },
);
