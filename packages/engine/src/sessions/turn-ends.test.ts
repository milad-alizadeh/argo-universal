import { expect, it } from 'vitest';
import { trackTurnEnds, type EndedTurn, type TurnView } from './turn-activity';

// A source whose Sessions the test changes, and whose listeners it fires.
function source(view: TurnView): {
  watch: (ended: (turn: EndedTurn) => void) => () => void;
  change: (activeTurnId: string | null) => void;
} {
  const listeners = new Set<() => void>();

  return {
    watch: (ended) =>
      trackTurnEnds(
        {
          views: () => [view],
          subscribe: (listener) => {
            listeners.add(listener);

            return (): void => {
              listeners.delete(listener);
            };
          },
        },
        ended,
      ),
    change: (activeTurnId) => {
      view.activeTurnId = activeTurnId;
      listeners.forEach((listener) => listener());
    },
  };
}

const idle = (): TurnView => ({
  sessionId: 's1',
  projectId: 'p1',
  activeTurnId: null,
});

it('reports a Session once when its own Turn ends, and not while it runs or idles', () => {
  const { watch, change } = source(idle());
  const ended: EndedTurn[] = [];

  watch((turn) => ended.push(turn));
  change(null);
  change('t1');
  change('t1');
  expect(ended).toEqual([]);

  change(null);
  change(null);
  expect(ended).toEqual([{ sessionId: 's1', projectId: 'p1' }]);
});

it('stops reporting once unwatched', () => {
  const { watch, change } = source(idle());
  const ended: EndedTurn[] = [];
  const unwatch = watch((turn) => ended.push(turn));

  change('t1');
  unwatch();
  change(null);
  expect(ended).toEqual([]);
});
