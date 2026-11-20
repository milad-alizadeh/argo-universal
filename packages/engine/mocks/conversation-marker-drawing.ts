import type {
  ContentBlock,
  FeedSubscribeOutput,
  SessionUpdate,
} from '@repo/contracts';

// One Agent message as a Feed subscriber is sent it, and what a client draws of it.

const rowId = 'message-1';

type MessageState = 'open' | 'settled';

const message = (text: string, state: MessageState): SessionUpdate => ({
  id: rowId,
  sessionId: 'session-1',
  position: 1,
  revision: 1,
  turnId: 'turn-1',
  state,
  sessionUpdate: 'agent_message',
  messageId: rowId,
  content: [{ type: 'text', text }],
});

// The message whole, still arriving unless it is `settled`.
export const opened = (
  text: string,
  state: MessageState = 'open',
): FeedSubscribeOutput => ({
  type: 'row.upsert',
  rev: 1,
  row: message(text, state),
});

export const appended = (text: string, off: number): FeedSubscribeOutput => ({
  type: 'row.append',
  rev: 2,
  id: rowId,
  field: 'content.0.text',
  text,
  off,
});

const textOfBlock = (block: ContentBlock | undefined): string =>
  block?.type === 'text' ? block.text : '';

const rowText = (row: SessionUpdate): string =>
  row.sessionUpdate === 'agent_message' ? textOfBlock(row.content[0]) : '';

const append = (
  text: string,
  event: Extract<FeedSubscribeOutput, { type: 'row.append' }>,
): string => (event.off === text.length ? text + event.text : text);

// A client applies an append only when its offset is the length of the text it holds.
const apply = (text: string, event: FeedSubscribeOutput): string => {
  if (event.type === 'row.upsert') return rowText(event.row);

  return event.type === 'row.append' ? append(text, event) : text;
};

// What a client holds after it applies each event in turn, as `output` passes it on.
export const clientText = (
  events: FeedSubscribeOutput[],
  output: (event: FeedSubscribeOutput) => FeedSubscribeOutput,
): string => events.reduce((text, event) => apply(text, output(event)), '');
