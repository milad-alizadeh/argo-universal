import type { FeedSubscribeOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { sendAcpFeedUpdates, waitForAcpSessionIdle } from '#mocks/acp-feed';

const chunkCount = 5000;
const chunks = Array.from({ length: chunkCount }, (_, index) => `${index},`);

const readMessageText = (
  events: readonly FeedSubscribeOutput[],
): { text: string; gaps: number } => {
  let text = '';
  let gaps = 0;
  for (const event of events) {
    if (
      event.type === 'row.upsert' &&
      event.row.sessionUpdate === 'agent_message'
    ) {
      const block = event.row.content[0];
      text = block?.type === 'text' ? block.text : '';
    }
    if (event.type === 'row.append') {
      if (event.off !== text.length) gaps += 1;
      text += event.text;
    }
  }
  return { text, gaps };
};

it('a subscriber that stops reading during a long message catches up whole without a gap', async () => {
  const host = await startAcpEngine({
    prompt: async (request) => {
      await sendAcpFeedUpdates(
        request,
        chunks.map((text) => ({
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text },
        })),
      );
      return { stopReason: 'end_turn' };
    },
  });
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
  const received: FeedSubscribeOutput[] = [];
  for (let next = await slow.next(); !next.done; next = await slow.next()) {
    received.push(next.value);
    if (next.value.type === 'snapshot' && next.value.snapshot.state === 'idle')
      break;
  }
  await slow.return?.();
  expect(readMessageText(received)).toEqual({ text: chunks.join(''), gaps: 0 });
  expect(received.length).toBeLessThan(chunkCount);
});
