import type {
  ContentBlock,
  FeedSubscribeOutput,
  SessionUpdate,
} from '@repo/contracts';
import { expect, it } from 'vitest';
import { VoiceMarkerFilter } from './marker-filter';

const rowId = 'message-1';

const sessionId = 'session-1';

const opened = (text: string): FeedSubscribeOutput => ({
  type: 'row.upsert',
  rev: 1,
  row: {
    id: rowId,
    sessionId,
    position: 1,
    revision: 1,
    turnId: 'turn-1',
    state: 'open',
    sessionUpdate: 'agent_message',
    messageId: rowId,
    content: [{ type: 'text', text }],
  },
});

const appended = (text: string, off: number): FeedSubscribeOutput => ({
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

// A client applies an append only when its offset is the length of the text it holds.
const apply = (text: string, event: FeedSubscribeOutput): string => {
  if (event.type === 'row.upsert') return rowText(event.row);

  return event.type === 'row.append' ? append(text, event) : text;
};

const append = (
  text: string,
  event: Extract<FeedSubscribeOutput, { type: 'row.append' }>,
): string => (event.off === text.length ? text + event.text : text);

// What a client holds after it applies each event in turn.
function drawn(events: FeedSubscribeOutput[]): string {
  const filter = new VoiceMarkerFilter();

  return events.reduce((text, event) => apply(text, filter.output(event)), '');
}

const marks = ['[STATUS]', '[COMPLETE]', '[ANALYSIS]'];

it.each(marks)(
  'hides %s that arrives split across chunks, and the space after it',
  (mark) => {
    const middle = Math.floor(mark.length / 2);

    expect(
      drawn([
        opened(''),
        appended(mark.slice(0, middle), 0),
        appended(`${mark.slice(middle)} `, middle),
        appended('Looking', mark.length + 1),
      ]),
    ).toBe('Looking');
  },
);

it.each(marks)(
  'hides %s that opens an upsert row, and the space after it',
  (mark) => {
    expect(
      drawn([opened(`${mark} Looking`), appended(' on', mark.length + 8)]),
    ).toBe('Looking on');
  },
);

it('hides a mark whose last character arrives with the text after it', () => {
  expect(drawn([opened('[STATUS'), appended('] Looking', 7)])).toBe('Looking');
});

it('shows text that only starts like a mark once it is known to be text', () => {
  expect(drawn([opened('[ST'), appended('ill here', 3)])).toBe('[STill here');
});

it('passes a message without a mark as it comes', () => {
  expect(drawn([opened('Hello'), appended(' there', 5)])).toBe('Hello there');
});

it('leaves a mark in the middle of a message alone', () => {
  expect(drawn([opened('Done [COMPLETE]'), appended(' ok', 15)])).toBe(
    'Done [COMPLETE] ok',
  );
});
