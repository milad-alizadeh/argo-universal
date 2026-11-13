import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { restartTurnError } from '../../feed';

const toolCallId = 'shell';

// claude-agent-acp's words for a Tool call its cancelled Turn cut short, sent to an ACP v1 client as `failed`.
const cutShort =
  'The turn was cancelled before this tool call returned a result.';

type AcpHost = Awaited<ReturnType<typeof startAcpEngine>>;

type FeedRows = Awaited<ReturnType<AcpHost['caller']['feed']['page']>>['rows'];

const readFeed = async (host: AcpHost, sessionId: string): Promise<FeedRows> =>
  (await host.caller.feed.page({ sessionId, direction: 'tail' })).rows;

// #2008: an Agent cancels its own Turn as the Engine stops, before the Session closes.
it('ends a running Turn as cut short by the Server, with its Tool call stopped, when the Engine stops', async () => {
  const stopping = Promise.withResolvers<void>();
  const running = Promise.withResolvers<void>();

  const before = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        {
          steps: [
            {
              type: 'update',
              update: {
                sessionUpdate: 'tool_call',
                toolCallId,
                title: 'Long command',
                kind: 'execute',
                status: 'in_progress',
              },
            },
            { type: 'gate', waitFor: stopping.promise, entered: running },
            {
              type: 'update',
              update: {
                sessionUpdate: 'tool_call_update',
                toolCallId,
                status: 'failed',
                content: [
                  {
                    type: 'content',
                    content: { type: 'text', text: cutShort },
                  },
                ],
              },
            },
          ],
          result: { stopReason: 'cancelled' },
        },
      ],
    },
  });

  const { sessionId } = await before.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Run the long command' }],
  });

  await running.promise;
  const stopped = before.stop();
  stopping.resolve();
  await stopped;

  const after = await startAcpEngine({ steps: [], restartOver: before.home });
  const rows = await readFeed(after, sessionId);

  expect(rows).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ toolCallId, status: 'cancelled' }),
      expect.objectContaining({
        _meta: {
          argo: {
            turnEnd: expect.objectContaining({
              stopReason: 'error',
              error: restartTurnError,
            }),
          },
        },
      }),
    ]),
  );
  expect(JSON.stringify(rows)).not.toContain(cutShort);
  expect(rows).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        _meta: {
          argo: {
            turnEnd: expect.objectContaining({ stopReason: 'cancelled' }),
          },
        },
      }),
    ]),
  );
});
