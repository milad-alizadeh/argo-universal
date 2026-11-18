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
  it('keeps an idle Session green and still while a Background Task runs', () => {
    expect(todosBar({ shells: oneRunning })).toMatchObject({
      tone: 'success',
      active: false,
    });
  });

  it('keeps an idle Session green and still while an Agent runs', () => {
    expect(todosBar({ subagents: oneRunning })).toMatchObject({
      tone: 'success',
      active: false,
    });
  });

  it('mutes an idle Session with nothing running', () => {
    expect(todosBar({})).toMatchObject({ tone: 'muted', active: false });
  });

  it.each([
    { status: 'failed', tone: 'danger', active: false },
    { status: 'unread', tone: 'info', active: false },
    { status: 'needs_input', tone: 'warning', active: true },
    { status: 'running', tone: 'success', active: true },
  ] as const)(
    'keeps a $status Session $tone while background work runs',
    ({ status, tone, active }) => {
      expect(
        todosBar({ status, shells: oneRunning, subagents: oneRunning }),
      ).toMatchObject({
        tone,
        active,
      });
    },
  );
});
