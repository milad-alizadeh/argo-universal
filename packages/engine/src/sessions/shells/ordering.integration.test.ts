import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { shell } from '@repo/db/schema';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { collectShellOutput } from '#mocks/shell-output';
import { ShellCapture } from '../acp/shell-capture';
import { createShellOutput, shellOutputPath } from './files';

const shellId = 'ordered-shell';

it('never commits an ended Shell Blob ahead of already queued output appends', async () => {
  const host = await startAcpEngine({ steps: [] });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Keep' }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);
  const path = shellOutputPath(host.home, created.sessionId, shellId);
  await createShellOutput(path);
  const endedOutputs: string[] = [];
  const failures: Error[] = [];

  const subscription = host.databaseWriter.on('writer.committed', () => {
    const record = host.database.select().from(shell).get();

    if (record?.outputBlobId)
      endedOutputs.push(
        readFileSync(join(host.blobsFolder, record.outputBlobId), 'utf8'),
      );
  });

  const capture = new ShellCapture({
    id: shellId,
    ...created,
    path,
    request: { sessionId: 'owned-1', command: 'fixture' },
    cwd: host.home,
    writer: host.databaseWriter,
    now: Date.now,
    changed: (): void => {},
    failed: (error): void => {
      failures.push(error);
    },
  });

  capture.append('first\n');
  capture.associate('fixture-tool');
  capture.append('last\n');
  await capture.end('exited', { exitCode: 0 });
  subscription.unsubscribe();
  expect(failures).toEqual([]);
  expect(endedOutputs).toEqual(['first\nlast\n']);

  const chunks = await collectShellOutput(
    await host.caller.shell.output({ ...created, shellId: shellId }),
  );

  expect(chunks).toEqual([
    { text: 'first\nlast\n', after: 11, status: 'exited' },
  ]);
});
