import { expect, it } from 'vitest';
import { edited, failed, showValue, unowned, type State } from './async-state';

type Load = Parameters<typeof showValue<number>>[1];

const gone = 'gh is down';

const load: Load = () => Promise.resolve(1);

const otherLoad: Load = () => Promise.resolve(2);

const showing = (value: number): State<number> =>
  showValue(unowned, load, value);

it('keeps the state when the same failure comes again', () => {
  const once = failed(showing(1), load, new Error(gone));

  expect(once.error).toBe(gone);
  expect(failed(once, load, new Error(gone))).toBe(once);
  expect(failed(once, load, 'gh is gone')).not.toBe(once);
});

it('keeps the value on screen through a failure', () => {
  expect(failed(showing(1), load, new Error(gone)).value).toBe(1);
});

it('drops an edit made by a load that has been replaced', () => {
  const current = showValue(unowned, otherLoad, 2);

  expect(edited(current, load, () => 9)).toBe(current);
});

it('applies an edit made by the load that owns the state', () => {
  const state = edited(showing(1), load, (value) => (value ?? 0) + 1);

  expect(state).toEqual({ owner: load, value: 2, error: undefined });
});
