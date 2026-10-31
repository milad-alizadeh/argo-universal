import type { OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { TRPCError } from '@trpc/server';
import {
  memorySessionDirectory,
  type MemorySession,
} from '#mocks/memory-session-directory';
import type { OperationCard } from '../../sessions';
import type { SessionInvoke } from '../implementations';
import type { SessionCaller } from '../session-tokens';
import { PromptChains, SessionScope, type ScopedRun } from '.';

export const runs = 'runs';

export const asks = 'asks';

export type ScopedOperation = { id: OperationId; params: Json };

// Sessions a caller started whose Turns are running.
const runningAgents = (
  callerId: string,
  count: number,
): Record<string, MemorySession> =>
  Object.fromEntries(
    Array.from({ length: count }, (_, index) => [
      `${callerId}-agent-${index}`,
      { projectId: 'p1', startedBySessionId: callerId, running: true },
    ]),
  );

// One below, and at, the five running Agents a caller may have.
const belowLimit = 4;

const atLimit = 5;

// Every Session is in Project p1 unless it says otherwise; foreign is in p2.
const directory = memorySessionDirectory({
  caller: { projectId: 'p1', startedBySessionId: null },
  started: { projectId: 'p1', startedBySessionId: 'caller' },
  unrelated: { projectId: 'p1', startedBySessionId: null },
  foreign: { projectId: 'p2', startedBySessionId: 'caller' },
  opening: { projectId: 'p1', startedBySessionId: 'caller', opening: true },
  middle: { projectId: 'p1', startedBySessionId: 'started' },
  deep: { projectId: 'p1', startedBySessionId: 'middle' },
  busy: { projectId: 'p1', startedBySessionId: null },
  full: { projectId: 'p1', startedBySessionId: null },
  ...runningAgents('busy', belowLimit),
  ...runningAgents('full', atLimit),
});

export const newScope = (chains = new PromptChains()): SessionScope =>
  new SessionScope({ directory, createId: () => 'new-session', chains });

export const sessionCaller = (sessionId: string): SessionCaller => ({
  kind: 'session',
  sessionId,
  projectId: 'p1',
});

const prompt = [{ type: 'text', text: 'Work' }];

export const startIn = (projectId: string, text = prompt): ScopedOperation => ({
  id: 'session.new',
  params: {
    projectId,
    agent: 'mock',
    checkout: { type: 'main' },
    configOptions: [],
    prompt: text,
  },
});

export const operation = (id: OperationId, params: Json): ScopedOperation => ({
  id,
  params,
});

export const promptTo = (sessionId: string): ScopedOperation => ({
  id: 'session.prompt',
  params: { sessionId, prompt },
});

export const ran = new Error('The Operation ran');

const refused = new Error('The user refused');

const named = new Map<unknown, string>([
  [ran, runs],
  [refused, asks],
]);

// runs, asks (the user refused the card), or the error code the scope refused with.
export function outcomeOf(cause: unknown): string {
  const outcome = named.get(cause);

  if (outcome) return outcome;

  return cause instanceof TRPCError ? cause.code : String(cause);
}

type Scoped = { outcome: string; cards: OperationCard[]; invoked: unknown[] };

// An invoke that records what it got, then stands for the Operation having run.
const recording =
  (invoked: unknown[]): SessionInvoke =>
  async (parsed, start) => {
    invoked.push(start ? { ...parsed, start } : parsed);
    throw ran;
  };

// The user refuses every card the scope shows.
const refusing =
  (cards: OperationCard[]): ScopedRun['call']['confirm'] =>
  async (card) => {
    cards.push(card);
    throw refused;
  };

export async function scoped(
  operation: ScopedOperation,
  caller = sessionCaller('caller'),
  scope = newScope(),
): Promise<Scoped> {
  const cards: OperationCard[] = [];
  const invoked: unknown[] = [];
  const call = { confirm: refusing(cards) };

  const outcome = await scope
    .run({ caller, call, invoke: recording(invoked) }, operation)
    .then(() => 'resolved', outcomeOf);

  return { outcome, cards, invoked };
}
