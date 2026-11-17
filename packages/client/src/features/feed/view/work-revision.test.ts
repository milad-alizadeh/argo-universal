import type { SessionUpdate } from '@repo/contracts';
import { recordedFeedMocks } from '@repo/mocks/app';
import { describe, expect, it } from 'vitest';
import { newestWorkRevision } from './work-revision';

const recorded = recordedFeedMocks.flatMap((mock) => mock.rows);

const rowOf = (kind: SessionUpdate['sessionUpdate']): SessionUpdate => {
  const row = recorded.find((held) => held.sessionUpdate === kind);

  if (!row) throw new Error(`Recorded catalog needs a ${kind} row`);

  return row;
};

const at = (row: SessionUpdate, revision: number): SessionUpdate => ({
  ...row,
  revision,
});

describe('newestWorkRevision', () => {
  it('is zero while no row is held', () => {
    expect(newestWorkRevision([])).toBe(0);
  });

  it('follows a Tool call', () => {
    const rows = [at(rowOf('tool_call_update'), 7)];

    expect(newestWorkRevision(rows)).toBe(7);
  });

  it('stays where it was while the Agent streams text', () => {
    const tool = at(rowOf('tool_call_update'), 7);

    const streaming = [
      tool,
      at(rowOf('agent_message'), 8),
      at(rowOf('agent_thought'), 9),
    ];

    expect(newestWorkRevision(streaming)).toBe(7);
  });

  it('follows the newest of several rows of work', () => {
    const rows = [
      at(rowOf('tool_call_update'), 12),
      at(rowOf('user_message'), 4),
      at(rowOf('agent_message'), 20),
    ];

    expect(newestWorkRevision(rows)).toBe(12);
  });
});
