import { expect, it, vi } from 'vitest';
import { AnsweredTurns } from './answered-turns';

it('keeps the answered Turn for a Session page that mounts again', () => {
  const turns = new AnsweredTurns();
  turns.answer('session-1', 'end-1');

  expect(turns.answered('session-1')).toBe('end-1');
});

it('keeps each Session’s answered Turn apart', () => {
  const turns = new AnsweredTurns();
  turns.answer('session-1', 'end-1');

  expect(turns.answered('session-2')).toBeUndefined();
});

it('tells its readers when a sign-in answers a Turn', () => {
  const turns = new AnsweredTurns();
  const listener = vi.fn<() => void>();
  turns.subscribe(listener);

  turns.answer('session-1', 'end-1');

  expect(listener).toHaveBeenCalledOnce();
});
