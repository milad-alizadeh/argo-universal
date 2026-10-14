import { newSessionBranches, newSessionCatalogs } from '@repo/mocks/app';
import { describe, expect, it } from 'vitest';
import { canOpenSession, toNewSessionInput } from './open-session';
import { toSessionChoices } from './session-choices';
import {
  firstAgent,
  input,
  mainProject,
  projectBaseBranch,
  worktreeProject,
} from './session-choices.mocks';

describe('toNewSessionInput', () => {
  it("opens an empty Session with the Project's defaults and the Agent", () => {
    expect(toNewSessionInput(toSessionChoices(input()))).toEqual({
      projectId: worktreeProject.id,
      agent: firstAgent.agent,
      checkout: { type: 'worktree', baseBranch: projectBaseBranch },
      configOptions: [],
      prompt: [],
    });
  });

  it('starts a main Project on its own checkout', () => {
    const choices = toSessionChoices(
      input({
        chosen: { projectId: mainProject.id },
        branches: newSessionBranches,
      }),
    );

    expect(toNewSessionInput(choices)?.checkout).toEqual({
      type: 'main',
    });
  });

  it('sends nothing without a Project', () => {
    expect(
      toNewSessionInput(toSessionChoices(input({ projects: [] }))),
    ).toBeUndefined();
  });
});

describe('canOpenSession', () => {
  const ready = {
    connected: true,
    choices: toSessionChoices(input()),
    sending: false,
    handedOff: false,
  };

  it('opens a Session once everything is ready', () => {
    expect(canOpenSession(ready)).toBe(true);
  });

  it.each([
    { case: 'while reconnecting', overrides: { connected: false } },
    {
      case: 'while the first prompt is on its way',
      overrides: { sending: true },
    },
    { case: 'once the Session has its prompt', overrides: { handedOff: true } },
    {
      case: "until a main Project's base branch loads",
      overrides: {
        choices: toSessionChoices(
          input({ chosen: { projectId: mainProject.id } }),
        ),
      },
    },
    {
      case: 'while the only Agent is still being checked',
      overrides: {
        choices: toSessionChoices(
          input({ agents: [{ ...firstAgent, status: 'checking' }] }),
        ),
      },
    },
    {
      case: 'without an Agent the picker offers',
      overrides: {
        choices: toSessionChoices(
          input({ agents: newSessionCatalogs.bothCantStart }),
        ),
      },
    },
    {
      case: 'without a Project',
      overrides: { choices: toSessionChoices(input({ projects: [] })) },
    },
  ])('refuses $case', ({ overrides }) => {
    expect(canOpenSession({ ...ready, ...overrides })).toBe(false);
  });
});
