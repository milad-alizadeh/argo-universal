import type { SessionConfigOption } from '@repo/contracts';
import { newSessionBranches, newSessionCatalogs } from '@repo/mocks/app';
import { describe, expect, it } from 'vitest';
import { canOpenSession, toNewSessionInput } from './open-session';
import { toSessionChoices } from './session-choices';
import {
  firstAgent,
  input,
  mainProject,
  notInstalled,
  projectBaseBranch,
  worktreeProject,
} from './session-choices.mocks';

const configuration: SessionConfigOption[] = firstAgent.configOptions;

describe('toNewSessionInput', () => {
  it("sends the Project's defaults, the Agent and its configuration with no prompt", () => {
    expect(toNewSessionInput(toSessionChoices(input()), configuration)).toEqual(
      {
        projectId: worktreeProject.id,
        agent: firstAgent.agent,
        checkout: { type: 'worktree', baseBranch: projectBaseBranch },
        configOptions: configuration.map(({ configId, currentValue }) => ({
          configId,
          value: currentValue,
        })),
        prompt: [],
      },
    );
  });

  it('starts a main Project on its own checkout', () => {
    const choices = toSessionChoices(
      input({
        chosen: { projectId: mainProject.id },
        branches: newSessionBranches,
      }),
    );
    expect(toNewSessionInput(choices, [])?.checkout).toEqual({
      type: 'main',
    });
  });

  it('sends nothing without a Project', () => {
    expect(
      toNewSessionInput(toSessionChoices(input({ projects: [] })), []),
    ).toBeUndefined();
  });
});

describe('canOpenSession', () => {
  const ready = {
    connected: true,
    choices: toSessionChoices(input()),
    configReady: true,
    opening: false,
  };

  it('opens a Session once everything is ready', () => {
    expect(canOpenSession(ready)).toBe(true);
  });

  it.each([
    { case: 'while reconnecting', overrides: { connected: false } },
    {
      case: 'while the configuration loads',
      overrides: { configReady: false },
    },
    { case: 'while a Session opens', overrides: { opening: true } },
    {
      case: "until a main Project's base branch loads",
      overrides: {
        choices: toSessionChoices(
          input({ chosen: { projectId: mainProject.id } }),
        ),
      },
    },
    {
      case: 'for an Agent that needs setup',
      overrides: {
        choices: toSessionChoices(
          input({
            agents: newSessionCatalogs.oneNotInstalled,
            chosen: { agent: notInstalled.agent },
          }),
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
