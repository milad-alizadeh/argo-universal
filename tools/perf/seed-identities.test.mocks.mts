import type { SessionUpdate } from '@repo/contracts';
import { expect } from 'vitest';

type TurnOwners = Map<string, Set<string | null>>;

function messageTurns(rows: SessionUpdate[]): TurnOwners {
  const owners: TurnOwners = new Map();

  for (const row of rows) {
    if (!('messageId' in row)) continue;
    const turns = turnsFor(owners, row.messageId);
    turns.add(row.turnId);
    owners.set(row.messageId, turns);
  }

  return owners;
}

function turnsFor(owners: TurnOwners, messageId: string): Set<string | null> {
  return owners.get(messageId) ?? new Set<string | null>();
}

// A logical message can contain several chunks, but never belongs to different copied Turns.
export function expectHistoryIdentities(
  rows: SessionUpdate[],
  sessionId: string,
): void {
  expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  expect(new Set(rows.map((row) => row.sessionId))).toEqual(
    new Set([sessionId]),
  );
  expect(
    new Set([...messageTurns(rows).values()].map((turns) => turns.size)),
  ).toEqual(new Set([1]));
  const tools = rows.filter((row) => row.sessionUpdate === 'tool_call_update');

  expect(new Set(tools.map((row) => row.id === row.toolCallId))).toEqual(
    new Set([true]),
  );
}
