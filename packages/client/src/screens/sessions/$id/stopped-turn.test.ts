import type { ContentBlock } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import type { FeedViewItem } from '#features/feed';
import { stoppedTurn as stoppedEnding } from '../../../features/feed/components/turn-end/turn-end.mocks';
import { stoppedTurn } from './stopped-turn';

const content: ContentBlock[] = [{ type: 'text', text: 'Fix the bug' }];

const { sessionId, position, revision, turnId } = stoppedEnding.row;

const prompt: FeedViewItem = {
  type: 'row',
  row: {
    id: 'prompt',
    sessionId,
    position,
    revision,
    turnId,
    state: 'settled',
    sessionUpdate: 'user_message',
    messageId: 'message',
    content,
  },
};

const ended = (
  stopReason: 'error' | 'end_turn' | 'cancelled',
): FeedViewItem => ({
  ...stoppedEnding,
  end: { ...stoppedEnding.end, stopReason },
});

describe('stoppedTurn', () => {
  it('offers the prompt of a Turn that ended in an error', () => {
    const ending = ended('error');

    expect(stoppedTurn([prompt, ending])).toEqual({ ending, prompt: content });
  });

  it('offers nothing after a Turn that ended any other way', () => {
    expect(stoppedTurn([prompt, ended('end_turn')])).toBeUndefined();
    expect(stoppedTurn([prompt, ended('cancelled')])).toBeUndefined();
  });

  it('offers nothing once a newer prompt follows the ending', () => {
    expect(stoppedTurn([prompt, ended('error'), prompt])).toBeUndefined();
  });

  it('offers nothing when the prompt is on an older page', () => {
    expect(stoppedTurn([ended('error')])).toBeUndefined();
  });
});
