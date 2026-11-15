import { expect, it } from 'vitest';
import { trackTurnEnds, type EndedTurn, type TurnView } from './turn-activity';

type Ended = (turn: EndedTurn) => void;

type Source = {
  watch: (ended: Ended) => () => void;
  change: (activeTurnId: string | null) => void;
};

// A source whose one Session the test changes, firing the listeners each time.
function source(view: TurnView): Source {
  const listeners = new Set<() => void>();

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);

    return (): void => {
      listeners.delete(listener);
    };
  };

  const watch = (ended: Ended): (() => void) =>
    trackTurnEnds({ views: () => [view], subscribe }, ended);

  const change = (activeTurnId: string | null): void => {
    view.activeTurnId = activeTurnId;
    listeners.forEach((listener) => listener());
  };

  return { watch, change };
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
