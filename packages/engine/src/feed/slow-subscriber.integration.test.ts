import { feedScenario } from '@repo/mocks/agent/feed-scenarios';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { readMessageText } from '#mocks/feed-message-observation';
import { readThrough, isIdle, closeStream } from '#mocks/feed-stream-reading';

const chunkCount = 5000;
const chunks = Array.from({ length: chunkCount }, (_, index) => `${index},`);

it('a subscriber that stops reading during a long message catches up whole without a gap', async () => {
  const host = await startAcpEngine(
    feedScenario(
      chunks.map((text) => ({
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text },
      })),
    ),
  );
  const created = await host.caller.session.new(emptySessionInput);
  const slow = (await host.caller.feed.subscribe({ ...created, after: null }))[
    Symbol.asyncIterator
  ]();
  await slow.next();
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Count' }],
  });
  await waitForAcpSessionIdle(host, created.sessionId);
  const received = await readThrough(slow, isIdle);
  await closeStream(slow);
  expect(readMessageText(received)).toEqual({ text: chunks.join(''), gaps: 0 });
  expect(received.length).toBeLessThan(chunkCount);
});
