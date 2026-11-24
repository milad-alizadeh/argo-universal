import { expect, it } from 'vitest';
import { takeTurns } from './pull-turns';

type Item = { sessionId: string; number: number };

const item = (sessionId: string, number: number): Item => ({
  sessionId,
  number,
});

type OpenTurns = {
  turnOf: (item: Item) => Promise<boolean>;
  open: () => string[];
  peakOf: (sessionId: string) => number;
  release: () => void;
};

// Turns that stay open until released, noting how many of each Session are open at once.
function openTurns(): OpenTurns {
  const open: Item[] = [];
  const peaks = new Map<string, number>();
  const releases: (() => void)[] = [];

  return {
    turnOf: (turn) => {
      open.push(turn);

      const same = open.filter(({ sessionId }) => sessionId === turn.sessionId);

      peaks.set(
        turn.sessionId,
        Math.max(peaks.get(turn.sessionId) ?? 0, same.length),
      );

      return new Promise((resolve) => {
        releases.push(() => {
          open.splice(open.indexOf(turn), 1);
          resolve(false);
        });
      });
    },
    open: () => open.map(({ sessionId, number }) => `${sessionId}#${number}`),
    peakOf: (sessionId) => peaks.get(sessionId) ?? 0,
    release: () => releases.shift()?.(),
  };
}

const settle = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

it('runs the Sessions at once and the pull requests of one Session one after another', async () => {
  const turns = openTurns();

  const done = takeTurns(
    { changed: () => {} },
    [item('a', 1), item('a', 2), item('b', 3)],
    turns.turnOf,
  );

  await settle();
  expect(turns.open()).toEqual(['a#1', 'b#3']);

  turns.release();
  turns.release();
  await settle();
  expect(turns.open()).toEqual(['a#2']);

  turns.release();
  await done;

  expect(turns.peakOf('a')).toBe(1);
});
