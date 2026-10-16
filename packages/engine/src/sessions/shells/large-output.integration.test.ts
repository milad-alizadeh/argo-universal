import { open, stat, truncate } from 'node:fs/promises';
import { join } from 'node:path';
import { shell, blob } from '@repo/db/schema';
import { expect, it, assert } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { startEngineTestHost } from '#mocks/engine';
import { collectShellOutput } from '#mocks/shell-output';
import { ShellCapture } from '../acp/shells/shell-capture';
import { readShellPreview } from '../acp/shells/shell-preview-file';
import { createShellOutput, shellOutputPath } from './files';

const largeBytes = 2_147_483_649;

const shellId = 'large-output';

it.each([
  { ending: 'exit', status: 'exited' },
  { ending: 'restart', status: 'lost' },
] as const)(
  'retains output over 2 GiB through %s with bounded preview and resumable output',
  async ({ ending, status }) => {
    const host = await startAcpEngine({ steps: [] });

    const created = await host.caller.session.new({
      ...emptySessionInput,
      prompt: [{ type: 'text', text: 'Keep' }],
    });

    await waitForAcpSessionIdle(host, created.sessionId);
    const path = shellOutputPath(host.home, created.sessionId, shellId);
    await createShellOutput(path);
    await truncate(path, largeBytes);
    const file = await open(path, 'r+');
    await file.write('TAIL', largeBytes - 4, 'utf8');
    await file.close();
    expect(await readShellPreview(path, 4)).toEqual({
      output: 'TAIL',
      truncated: true,
    });
    const failures: Error[] = [];
    let reader = host;

    if (ending === 'exit') {
      const capture = new ShellCapture({
        ...created,
        id: shellId,
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

      capture.associate('fixture-tool');
      await capture.end('exited', { exitCode: 0 });
    } else {
      host.database
        .insert(shell)
        .values({
          ...created,
          id: shellId,
          toolCallId: 'fixture-tool',
          command: 'fixture',
          cwd: host.home,
          status: 'running',
          startedAt: Date.now(),
        })
        .run();
      await host.stop();
      reader = {
        ...host,
        ...(await startEngineTestHost({ home: host.home, acp: host.agent })),
      };
    }

    expect(failures).toEqual([]);
    const record = reader.database.select().from(shell).get();
    assert(record);
    assert(record.outputBlobId);
    expect(
      (await stat(join(reader.blobsFolder, record.outputBlobId))).size,
    ).toBe(largeBytes);
    expect(reader.database.select().from(blob).get()).toMatchObject({
      id: record.outputBlobId,
      bytes: largeBytes,
    });

    const chunks = await collectShellOutput(
      await reader.caller.shell.output({
        ...created,
        shellId,
        after: largeBytes - 4,
      }),
    );

    expect(chunks).toEqual([
      {
        text: 'TAIL',
        after: largeBytes,
        status,
      },
    ]);
  },
  15_000,
);
