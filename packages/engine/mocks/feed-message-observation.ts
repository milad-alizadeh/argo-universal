import type { FeedSubscribeOutput } from '@repo/contracts';
import { assert } from 'vitest';
interface MessageObservation {
  text: string;
  gaps: number;
}
const observe = (
  state: MessageObservation,
  event: FeedSubscribeOutput,
): MessageObservation => {
  if (event.type === 'row.append')
    return {
      text: state.text + event.text,
      gaps: state.gaps + Number(event.off !== state.text.length),
    };
  return observeUpsert(state, event);
};
const observeUpsert = (
  state: MessageObservation,
  event: FeedSubscribeOutput,
): MessageObservation => {
  if (event.type !== 'row.upsert') return state;
  if (event.row.sessionUpdate !== 'agent_message') return state;
  const block = event.row.content[0];
  assert(block);
  assert(block.type === 'text');
  return { text: block.text, gaps: state.gaps };
};
export const readMessageText = (
  events: readonly FeedSubscribeOutput[],
): MessageObservation => events.reduce(observe, { text: '', gaps: 0 });
