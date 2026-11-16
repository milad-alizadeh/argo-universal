import type { SessionUpdate } from '@repo/contracts';

type Kind = SessionUpdate['sessionUpdate'];

// The Agent's words arrive a few characters at a time, each a new revision, and none of them touches the Checkout.
const streamedText: ReadonlySet<Kind> = new Set([
  'agent_message',
  'agent_thought',
]);

/*
 * The newest revision among the held rows that are not the Agent's streamed text: Tool calls, prompts, plans and the
 * rest. What reads the Checkout reloads when this moves, and stays as it is while the Agent only writes.
 */
export const newestWorkRevision = (rows: readonly SessionUpdate[]): number =>
  rows.reduce(
    (newest, row) =>
      streamedText.has(row.sessionUpdate)
        ? newest
        : Math.max(newest, row.revision),
    0,
  );
