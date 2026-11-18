import type { SessionInfo } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { sessionProgress } from './session-row-todos';

type Work = Pick<SessionInfo, 'plan' | 'status' | 'shells' | 'subagents'>;

const none = { running: 0, total: 0 };

const one = { running: 1, total: 1 };

function bar(work: Partial<Work>): ReturnType<typeof sessionProgress> {
  return sessionProgress({
    plan: { done: 2, total: 5 },
    status: 'idle',
    shells: none,
    subagents: none,
    ...work,
  });
}

describe('sessionProgress', () => {
  it('keeps an idle Session green and still while a Background Task runs', () => {
    expect(bar({ shells: one })).toMatchObject({
      tone: 'success',
      active: false,
    });
  });

  it('keeps an idle Session green and still while an Agent runs', () => {
    expect(bar({ subagents: one })).toMatchObject({
      tone: 'success',
      active: false,
    });
  });

  it('mutes an idle Session with nothing running', () => {
    expect(bar({})).toMatchObject({ tone: 'muted', active: false });
  });

  it.each([
    { status: 'failed', tone: 'danger', active: false },
    { status: 'unread', tone: 'info', active: false },
    { status: 'needs_input', tone: 'warning', active: true },
    { status: 'running', tone: 'success', active: true },
  ] as const)(
    'keeps a $status Session $tone while background work runs',
    ({ status, tone, active }) => {
      expect(bar({ status, shells: one, subagents: one })).toMatchObject({
        tone,
        active,
      });
    },
  );
});
