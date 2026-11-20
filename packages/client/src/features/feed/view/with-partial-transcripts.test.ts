import type { ConversationPartial } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { feedItemKey, type FeedViewItem } from './feed-view';
import { withPartialTranscripts } from './with-partial-transcripts';

const notice: FeedViewItem = {
  type: 'row',
  row: {
    id: 'n',
    sessionId: 's',
    position: 4,
    revision: 4,
    turnId: null,
    state: 'settled',
    sessionUpdate: 'notice',
    severity: 'info',
    title: 'Done',
  },
};

const person: ConversationPartial = {
  speaker: 'person',
  id: 'p1',
  rowId: 'call-1:person:p1',
  text: 'Is it',
};

const voice: ConversationPartial = {
  speaker: 'voice',
  id: 'v1',
  rowId: 'call-1:voice:v1',
  text: 'Not ye',
};

// The row the person's words are stored as once final.
const personFinal: FeedViewItem = {
  type: 'row',
  row: {
    id: person.rowId,
    messageId: person.id,
    sessionId: 's',
    position: 5,
    revision: 5,
    turnId: null,
    state: 'settled',
    sessionUpdate: 'person_transcript',
    content: [{ type: 'text', text: 'Is it done?' }],
  },
};

const keys = (partials: ConversationPartial[]): string[] =>
  withPartialTranscripts([], partials, 's').map(feedItemKey);

describe('withPartialTranscripts', () => {
  it('leaves the Feed as it is when nobody is mid-sentence', () => {
    const items = [notice];
    expect(withPartialTranscripts(items, [], 's')).toBe(items);
  });

  it('draws each partial last, flagged, as the kind of row its speaker has', () => {
    const items = withPartialTranscripts([notice], [person, voice], 's');
    expect(items).toHaveLength(3);
    expect(items[0]).toBe(notice);
    expect(items.slice(1)).toMatchObject([
      {
        type: 'row',
        partial: true,
        row: {
          sessionUpdate: 'person_transcript',
          state: 'open',
          content: [{ type: 'text', text: 'Is it' }],
        },
      },
      {
        type: 'row',
        partial: true,
        row: {
          sessionUpdate: 'voice_transcript',
          state: 'open',
          content: [{ type: 'text', text: 'Not ye' }],
        },
      },
    ]);
  });

  it('keys a partial as the row its final words are stored as, so the Feed draws them as one row', () => {
    expect(keys([person])).toEqual([person.rowId]);
    expect(keys([{ ...person, text: 'Is it done?' }])).toEqual([person.rowId]);
    expect(feedItemKey(personFinal)).toBe(person.rowId);
  });

  it('draws a partial no longer once the Feed holds its final row', () => {
    const items = withPartialTranscripts([personFinal], [person, voice], 's');
    expect(items.map(feedItemKey)).toEqual([person.rowId, voice.rowId]);
    expect(items[0]).toBe(personFinal);
  });
});
