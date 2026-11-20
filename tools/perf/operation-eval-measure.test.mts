import { expect, it } from 'vitest';
import {
  measureRun,
  type FeedCall,
  type FirstTurn,
} from './operation-eval-measure.mts';

const newSession = 'session.new';

const run = 'operation_run';

const turn: FirstTurn = {
  startedAt: 1000,
  endedAt: 9000,
  stoppedBy: null,
  model: 'opus',
  totalTokens: 1200,
};

const agent = (at: number, name: string): FeedCall => ({
  at,
  argo: false,
  name,
  status: 'completed',
});

const argo = (at: number, name: string): FeedCall => ({
  at,
  argo: true,
  name,
  status: 'completed',
});

it('times the expected Operation from the Turn start and counts what came before it', () => {
  const calls = [
    agent(1500, 'ToolSearch'),
    agent(2000, 'operation_list'),
    argo(2100, 'operations.list'),
    agent(4000, run),
    argo(4100, newSession),
    agent(5000, run),
    argo(5100, 'session.rename'),
  ];

  expect(measureRun(turn, calls, newSession)).toEqual({
    outcome: 'found',
    msToOperation: 3100,
    agentCallsBefore: 3,
    searchesBefore: 1,
    toolLoadsBefore: 1,
    turnMs: 8000,
    model: 'opus',
    totalTokens: 1200,
  });
});

it('misses an Operation the Turn ended without running, and says why a Turn never ended', () => {
  const calls = [
    agent(2000, 'exec_command'),
    { ...argo(2100, newSession), status: 'failed' },
  ];

  expect(measureRun(turn, calls, newSession)).toMatchObject({
    outcome: 'missed',
    msToOperation: null,
    agentCallsBefore: 1,
  });
  expect(
    measureRun(
      { ...turn, endedAt: null, stoppedBy: 'timeout' },
      [],
      newSession,
    ),
  ).toMatchObject({
    outcome: 'timeout',
    turnMs: null,
  });
  expect(
    measureRun(
      { ...turn, endedAt: null, stoppedBy: 'waiting' },
      [],
      newSession,
    ),
  ).toMatchObject({ outcome: 'waiting' });
});
