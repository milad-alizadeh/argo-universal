import { expect, it, vi } from 'vitest';
import { TurnSignIns } from './turn-sign-ins';

it('keeps the answered Turn for a Session page that mounts again', () => {
  const signIns = new TurnSignIns();
  signIns.finish('session-1', 'end-1');

  expect(signIns.of('session-1')).toEqual({
    authenticating: undefined,
    answered: 'end-1',
  });
});

it('keeps the Turn whose Authenticate was pressed until its sign-in finishes', () => {
  const signIns = new TurnSignIns();
  signIns.authenticate('session-1', 'end-1');

  expect(signIns.of('session-1').authenticating).toBe('end-1');
});

it('keeps the answered Turn when a sign-in after a refused open finishes', () => {
  const signIns = new TurnSignIns();
  signIns.finish('session-1', 'end-1');
  signIns.authenticate('session-1', 'end-2');

  signIns.finish('session-1');

  expect(signIns.of('session-1')).toEqual({
    authenticating: undefined,
    answered: 'end-1',
  });
});

it('keeps each Session’s Turn sign-in apart', () => {
  const signIns = new TurnSignIns();
  signIns.authenticate('session-1', 'end-1');
  signIns.finish('session-1', 'end-1');

  expect(signIns.of('session-2')).toEqual({});
});

it('tells its readers when Authenticate is pressed and when a sign-in answers a Turn', () => {
  const signIns = new TurnSignIns();
  const listener = vi.fn<() => void>();
  signIns.subscribe(listener);

  signIns.authenticate('session-1', 'end-1');
  signIns.finish('session-1', 'end-1');

  expect(listener).toHaveBeenCalledTimes(2);
});

it('gives a reader the same record until it changes', () => {
  const signIns = new TurnSignIns();
  signIns.authenticate('session-1', 'end-1');
  const read = signIns.of('session-1');

  signIns.authenticate('session-1', 'end-1');

  expect(signIns.of('session-1')).toBe(read);
});
