import type { FeedSubscribeOutput } from '@repo/contracts';
const messageLength = (event: FeedSubscribeOutput, length: number): number => {
  if (event.type === 'row.append') return length + event.text.length;
  return upsertLength(event, length);
};
const upsertLength = (event: FeedSubscribeOutput, length: number): number => {
  if (event.type !== 'row.upsert') return length;
  if (event.row.sessionUpdate !== 'agent_message') return length;
  return event.row.content.reduce(
    (sum, block) => sum + (block.type === 'text' ? block.text.length : 0),
    0,
  );
};
const nextPhase = (event: FeedSubscribeOutput, previous: string): string => {
  if (event.type !== 'snapshot') return previous;
  if (event.snapshot.state === 'running') return 'running';
  return completedPhase(previous, event.snapshot.state);
};
const completedPhase = (previous: string, state: string): string => {
  return previous === 'running' && state === 'idle' ? 'done' : previous;
};
export const readUntilIdle = async (
  events: AsyncIterable<FeedSubscribeOutput>,
): Promise<number> => {
  let length = 0;
  let phase = 'waiting';
  for await (const event of events) {
    length = messageLength(event, length);
    phase = nextPhase(event, phase);
    if (phase === 'done') return length;
  }
  return length;
};
