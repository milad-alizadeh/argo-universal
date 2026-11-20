import { describe, expect, it } from 'vitest';
import { sessionProgress } from './session-row-todos';

type SessionWork = Parameters<typeof sessionProgress>[0];

const noneRunning = { running: 0, total: 0 };

const oneRunning = { running: 1, total: 1 };

function todosBar(
  work: Partial<SessionWork>,
): ReturnType<typeof sessionProgress> {
  return sessionProgress({
    plan: { done: 2, total: 5 },
    status: 'idle',
    shells: noneRunning,
    subagents: noneRunning,
    ...work,
  });
}

describe('sessionProgress', () => {
  it('keeps an idle Session green while a Background Task runs', () => {
    expect(todosBar({ shells: oneRunning })).toMatchObject({ tone: 'success' });
  });

  it('keeps an idle Session green while an Agent runs', () => {
    expect(todosBar({ subagents: oneRunning })).toMatchObject({
      tone: 'success',
    });
  });

  it('mutes an idle Session with nothing running', () => {
    expect(todosBar({})).toMatchObject({ tone: 'muted' });
  });

  it.each([
    { status: 'failed', tone: 'danger' },
    { status: 'unread', tone: 'info' },
    { status: 'needs_input', tone: 'warning' },
    { status: 'running', tone: 'success' },
  ] as const)(
    'keeps a $status Session $tone while background work runs',
    ({ status, tone }) => {
      expect(
        todosBar({ status, shells: oneRunning, subagents: oneRunning }),
      ).toMatchObject({ tone });
    },
  );

  it('glints the step underway while the Session runs', () => {
    expect(todosBar({ status: 'running' })).toMatchObject({ active: true });
  });

  it('glints while an idle Session still has background work', () => {
    expect(todosBar({ shells: oneRunning })).toMatchObject({ active: true });
  });

  it.each(['needs_input', 'failed', 'idle'] as const)(
    'holds a %s Session still',
    (status) => {
      expect(todosBar({ status })).toMatchObject({ active: false });
    },
  );

  it('reads a last Todo underway as 3 of 4, not a full bar', () => {
    expect(
      todosBar({ plan: { done: 3, inProgress: 1, total: 4 } }),
    ).toMatchObject({
      value: 0.75,
      steps: { done: 3, started: 1, total: 4 },
      accessibilityLabel: 'Todos: 3 of 4 complete, 1 in progress',
    });
  });
});
