import type { VoicePartial } from '@repo/contracts';
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

const person: VoicePartial = { speaker: 'person', id: 'p1', text: 'Is it' };

const voice: VoicePartial = { speaker: 'voice', id: 'v1', text: 'Not ye' };

const keys = (partials: VoicePartial[]): string[] =>
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

  it('keeps the partial’s key while its words grow, and apart from the final row', () => {
    expect(keys([person])).toEqual(['partial:person']);
    expect(keys([{ ...person, text: 'Is it done?' }])).toEqual([
      'partial:person',
    ]);
  });
});
