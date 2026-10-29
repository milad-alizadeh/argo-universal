import type { FeedSubscribeOutput, ToolCallUpdate } from '@repo/contracts';
import { assert, expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { openAcpFeedSession } from '#mocks/acp-feed';
import {
  largeStream,
  streamedTerminals,
  terminalUpdate,
} from '#mocks/acp-terminal-output';
import {
  closeStream,
  isTurnComplete,
  readThrough,
} from '#mocks/feed-stream-reading';
import { readBlobText } from '#mocks/feed-tool-output';

const upsert = 'row.upsert';

const isLiveOutput = (event: FeedSubscribeOutput): boolean => {
  if (event.type !== upsert) return false;

  if (event.row.sessionUpdate !== terminalUpdate) return false;

  return event.row.content.some(
    (block) => block.type === 'terminal' && block.output === 'AA',
  );
};

const isSecondCommand = (event: FeedSubscribeOutput): boolean => {
  if (event.type !== upsert) return false;

  return (
    event.row.sessionUpdate === terminalUpdate &&
    event.row.toolCallId === 'exec-b'
  );
};

it('streams equal chunks once per message, ignores mismatched or malformed chunks, and replays complete output', async () => {
  const finish = Promise.withResolvers<void>();
  const host = await startAcpEngine(streamedTerminals(finish.promise));
  const { sessionId } = await host.caller.session.new(emptySessionInput);

  const stream = (await host.caller.feed.subscribe({ sessionId, after: null }))[
    Symbol.asyncIterator
  ]();

  await stream.next();
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Run' }],
  });

  const live = await readThrough(stream, isLiveOutput);

  expect(live.at(-1)).toMatchObject({
    type: upsert,
    row: { content: [{ type: 'terminal', output: 'AA' }] },
  });
  finish.resolve();
  await readThrough(stream, isTurnComplete);
  await closeStream(stream);
  await host.caller.session.close({ sessionId });

  const replay = (
    await host.caller.feed.subscribe({
      sessionId,
      after: { epoch: 0, revision: 0 },
    })
  )[Symbol.asyncIterator]();

  const events = await readThrough(replay, isSecondCommand);

  expect(events.filter((event) => event.type === upsert)).toMatchObject([
    { row: { sessionUpdate: 'user_message' } },
    {
      row: {
        toolCallId: 'exec-a',
        content: [{ output: 'AA', exitStatus: { exitCode: 0 } }],
      },
    },
    {
      row: {
        toolCallId: 'exec-b',
        content: [{ output: 'B', exitStatus: { exitCode: 0 } }],
      },
    },
  ]);
  await closeStream(replay);
});

const writtenTool = async (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
  sessionId: string,
): Promise<ToolCallUpdate> =>
  vi.waitFor(async () => {
    const page = await host.caller.feed.page({ sessionId, direction: 'tail' });

    const row = page.rows.find(
      (candidate) => candidate.sessionUpdate === terminalUpdate,
    );

    assert(row?.sessionUpdate === terminalUpdate);

    return row;
  });

const outputBlobId = (row: ToolCallUpdate): string => {
  const output = row._meta?.argo?.fullOutput;

  assert(output);
  assert(output.content);

  return output.content.blobId;
};

it('large streamed terminal output keeps a bounded preview and the complete output Blob through later chunks', async () => {
  const head = `head ${'€'.repeat(40_000)}`;
  const { host, sessionId } = await openAcpFeedSession(largeStream(head));
  const row = await writtenTool(host, sessionId);
  const block = row.content[0];

  assert(block?.type === 'terminal');
  expect(Buffer.byteLength(block.output)).toBeLessThanOrEqual(65_544);
  expect(block.output.startsWith('head ')).toBe(true);
  expect(block.output.endsWith('\ntail')).toBe(true);
  expect(block.output).not.toContain('�');
  expect(row._meta).toMatchObject({ argo: { truncated: true } });

  const full = JSON.parse(await readBlobText(host, outputBlobId(row)));

  expect(full[0].output).toBe(`${head}\ntail`);
  expect(full[0].exitStatus).toEqual({ exitCode: 0 });
});
