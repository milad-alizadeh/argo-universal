import { describe, expect, it } from 'vitest';
import { holdToLift, type PressStart } from './list-drag-rules';
import type { Point } from './list-drop-aim';
import { RowPress, type PressDrag } from './list-row-press';

type Call = [name: string, ...args: unknown[]];

interface Recorded {
  press: RowPress;
  calls: Call[];
}

const start: Point = { x: 100, y: 100 };

const away: Point = { x: 100, y: 140 };

function pressWith(pointer: PressStart['pointer']): Recorded {
  const calls: Call[] = [];

  const drag: PressDrag = {
    prepare: (id) => calls.push(['prepare', id]),
    begin: (id, _ghost, point) => calls.push(['begin', id, point]),
    follow: (point) => calls.push(['follow', point]),
    finish: () => calls.push(['finish']),
    cancel: () => calls.push(['cancel']),
  };

  const target = { drag, id: 'login', ghost: null };

  return { press: new RowPress(target, { start, at: 0, pointer }), calls };
}

describe('a press on a movable row', () => {
  it('measures the List as it begins', () => {
    const { calls } = pressWith('mouse');

    expect(calls).toEqual([['prepare', 'login']]);
  });

  it('lifts the row from where the mouse pressed it, then follows the pointer', () => {
    const { press, calls } = pressWith('mouse');

    press.move(away, 10);

    expect(calls.slice(1)).toEqual([
      ['begin', 'login', start],
      ['follow', away],
    ]);
  });

  it('waits while the mouse stays within the slop', () => {
    const { press } = pressWith('mouse');

    expect(press.move({ x: 101, y: 101 }, 10)).toBe('wait');
  });

  it('leaves a finger that moves before the hold ends to the scroll, and never lifts it', () => {
    const { press, calls } = pressWith('touch');

    press.move(away, holdToLift - 1);
    press.move(away, holdToLift + 1);

    expect(calls).toEqual([['prepare', 'login']]);
  });

  it('lifts the row for a finger that held it, from where it pressed', () => {
    const { press, calls } = pressWith('touch');

    press.move(away, holdToLift);

    expect(calls[1]).toEqual(['begin', 'login', start]);
  });

  it('follows the lifted row', () => {
    const { press } = pressWith('mouse');

    press.move(away, 10);

    expect(press.move(start, 20)).toBe('follow');
  });

  it('drops a lifted row on release', () => {
    const { press, calls } = pressWith('mouse');

    press.move(away, 10);
    press.release();

    expect(calls.at(-1)).toEqual(['finish']);
  });

  it('drops nothing when released before it lifts', () => {
    const { press } = pressWith('mouse');

    expect(press.release()).toBe(false);
  });

  it('puts a lifted row back when cancelled', () => {
    const { press, calls } = pressWith('mouse');

    press.move(away, 10);
    press.cancel();

    expect(calls.at(-1)).toEqual(['cancel']);
  });

  it('keeps a finger held long enough from the page’s scroll', () => {
    const { press } = pressWith('touch');

    expect(press.holds(holdToLift)).toBe(true);
  });
});
