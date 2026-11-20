import type { ConversationPartial } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { drawnPartials, holdPartials, noHeldPartials } from './held-partials';

const saying = (id: string, text: string): ConversationPartial => ({
  speaker: 'voice',
  id,
  rowId: `call-1:voice:${id}`,
  text,
});

describe('holdPartials', () => {
  it('draws the live partials as the call gives them', () => {
    const live = [saying('v1', 'Not')];
    expect(drawnPartials(holdPartials(noHeldPartials, live))).toEqual(live);
  });

  it('keeps the last words of a partial the call has cleared, so they stay drawn until their final row reaches the Feed', () => {
    const growing = holdPartials(noHeldPartials, [saying('v1', 'Not')]);
    const grown = holdPartials(growing, [saying('v1', 'Not yet')]);
    const cleared = holdPartials(grown, []);
    expect(drawnPartials(cleared)).toEqual([saying('v1', 'Not yet')]);
  });

  it('draws a held partial before the next one being said', () => {
    const first = holdPartials(noHeldPartials, [saying('v1', 'Not yet.')]);
    const next = holdPartials(first, [saying('v2', 'But')]);
    expect(drawnPartials(next).map((partial) => partial.id)).toEqual([
      'v1',
      'v2',
    ]);
  });

  it('never draws a partial twice when it is live again', () => {
    const cleared = holdPartials(
      holdPartials(noHeldPartials, [saying('v1', 'Not')]),
      [],
    );

    const back = holdPartials(cleared, [saying('v1', 'Not yet')]);
    expect(drawnPartials(back)).toEqual([saying('v1', 'Not yet')]);
  });
});
