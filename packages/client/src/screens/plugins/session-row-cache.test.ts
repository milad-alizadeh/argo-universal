import {
  sessionRowSlotId,
  type SlotContextOf,
  type SlotItems,
} from '@repo/contracts/plugins/wire';
import { describe, expect, it, vi } from 'vitest';
import {
  cachedRows,
  type DrawFromSent,
  keptAnswers,
  noKeptAnswers,
  redrawnRows,
  type RowCache,
} from './session-row-cache';

const context = (
  sessionId: string,
): SlotContextOf<typeof sessionRowSlotId> => ({
  sessionId,
  projectId: 'argo',
});

const answer = (text: string): SlotItems[string] => ({
  items: [{ pluginId: 'issues', item: { text } }],
  overflow: [],
});

const noRows: RowCache<string> = new Map();

describe('the answers a Sessions list keeps', () => {
  it('keeps a Session’s answer once its row leaves the window, and clears one the Plugins stopped answering for', () => {
    const first = keptAnswers(noKeptAnswers, {
      contexts: [context('a'), context('b')],
      items: { a: answer('Issue 1'), b: answer('Issue 2') },
    });

    const scrolled = keptAnswers(first, {
      contexts: [context('b'), context('c')],
      items: { c: answer('Issue 3') },
    });

    expect(scrolled.get('a')).toEqual(answer('Issue 1'));
    expect(scrolled.get('b')).toBeUndefined();
    expect(scrolled.get('c')).toEqual(answer('Issue 3'));
  });

  it('redraws only the rows whose answers changed', () => {
    const draw = vi.fn<DrawFromSent<string>>((items) => JSON.stringify(items));
    const lines = noKeptAnswers;

    const before = redrawnRows(
      noRows,
      {
        items: new Map([
          ['a', answer('1')],
          ['b', answer('2')],
        ]),
        lines,
      },
      draw,
    );

    const after = redrawnRows(
      before,
      {
        items: new Map([
          ['a', answer('1')],
          ['b', answer('3')],
        ]),
        lines,
      },
      draw,
    );

    expect(cachedRows(after).get('a')).toBe(cachedRows(before).get('a'));
    expect(cachedRows(after).get('b')).toBe(JSON.stringify(answer('3')));
    expect(draw).toHaveBeenCalledTimes(3);
  });

  it('leaves out a row with nothing to draw', () => {
    const rows = redrawnRows(
      noRows,
      { items: new Map([['a', undefined]]), lines: noKeptAnswers },
      () => {},
    );

    expect(cachedRows(rows).has('a')).toBe(false);
  });
});
