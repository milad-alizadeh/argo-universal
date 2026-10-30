import { expect, it } from 'vitest';
import { openMemorySubagents } from '#mocks/memory-subagents';
import { AgentProcessExitError } from '../../agents';
import { sessionTurn } from '.';

type CrashContext = Parameters<typeof sessionTurn.crash>[0];

const crashed = (error: Error) => ({ type: 'acp.failed', error }) as const;

const failed = crashed(new Error('Agent exited'));

const crashContext = (overrides: Partial<CrashContext> = {}): CrashContext => ({
  activeTurnId: 'turn-1',
  turnEnding: { kind: 'completion' },
  subagents: { children: new Map(), pendingMessages: [] },
  input: { now: () => 200 },
  ...overrides,
});

it('joins an Agent crash to the ending of the Turn it cut short', (): void => {
  const step = sessionTurn.crash(crashContext(), failed, true);

  expect(step.feed).toEqual([]);
  expect(step.change).toEqual({
    turnEnding: {
      kind: 'agent_crash',
      occurredAt: 200,
      title: 'Agent exited',
      description: undefined,
    },
  });
});

it('announces an Agent crash at once when no Turn is running', (): void => {
  const step = sessionTurn.crash(
    crashContext({ activeTurnId: null }),
    failed,
    false,
  );

  expect(step.change).toBeUndefined();
  expect(step.feed).toEqual([
    expect.objectContaining({
      type: 'feed.turnEnding',
      turnId: null,
      ending: expect.objectContaining({ kind: 'agent_crash' }),
    }),
  ]);
});

it('ends each Subagent Turn through its Feed, then stores it, before the Session announces', (): void => {
  const { route, state } = openMemorySubagents();

  route({
    sessionId: 'acp-session',
    update: {
      sessionUpdate: 'subagent_update',
      sessionId: 'vendor-child',
      state: { state: 'running' },
    },
  });

  const step = sessionTurn.crash(
    crashContext({ activeTurnId: null, subagents: state() }),
    failed,
    false,
  );

  expect(step.writes).toEqual([]);
  expect(step.subagentTurns).toHaveLength(1);
  expect(step.subagentTurns[0]?.event).toMatchObject({
    type: 'feed.completeTurn',
    ending: { kind: 'agent_crash', occurredAt: 200 },
  });
  expect(step.subagentTurns[0]?.write.job.describe()).toContain('update Turn');
  expect(step.feed).toHaveLength(1);
});

// Bun's own report of an absent command, with the Agent's spawn arguments (an ARGO_HOME path among them).
const bunStack = `error: Executable not found in $PATH: "amp"
 errno: -2,
 syscall: "spawn amp",
 code: "ENOENT",
 spawnargs: ["--mcp-config", "/Users/someone/.argo/mcp/config.json"]
      at /$bunfs/root/amp-acp-darwin-arm64:12:3

Bun v1.4.2 (macOS arm64)`;

it('reports a missing command as one, with no stack trace or path', (): void => {
  const step = sessionTurn.crash(
    crashContext(),
    crashed(new AgentProcessExitError(1, null, bunStack)),
    true,
  );

  expect(step.change).toEqual({
    turnEnding: {
      kind: 'agent_crash',
      occurredAt: 200,
      title: "Couldn't start `amp`",
      description:
        '`amp` is not installed. Install it, then send the prompt again.',
    },
  });
});

it('keeps the stderr of a crash that is not a missing command', (): void => {
  const step = sessionTurn.crash(
    crashContext(),
    crashed(new AgentProcessExitError(1, null, 'boom')),
    true,
  );

  expect(step.change).toMatchObject({
    turnEnding: { title: 'Agent exited with status 1', description: 'boom' },
  });
});
