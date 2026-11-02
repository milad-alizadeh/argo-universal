import { expect, it, vi } from 'vitest';
import type { Connection } from '#features/connection';
import { TurnSignIns, turnSignInsOf } from './turn-sign-ins';

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

  expect(signIns.of('session-2')).toEqual({
    authenticating: undefined,
    answered: undefined,
  });
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

// A Server's Connection, by identity only.
const serverConnection = (): Connection => ({
  state: () => 'open',
  subscribe: () => () => {},
  nextAttempt: () => Promise.resolve(),
  watch: () => {},
  foreground: () => {},
  retry: () => {},
  refuse: () => {},
  stop: () => {},
});

it('keeps one record for each Server’s Connection', () => {
  const server = serverConnection();
  turnSignInsOf(server).finish('session-1', 'end-1');

  expect(turnSignInsOf(server).of('session-1').answered).toBe('end-1');
  expect(
    turnSignInsOf(serverConnection()).of('session-1').answered,
  ).toBeUndefined();
});
