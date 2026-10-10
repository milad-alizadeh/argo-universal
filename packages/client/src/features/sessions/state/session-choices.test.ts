import { newSessionCatalogs } from '@repo/mocks/app';
import { describe, expect, it } from 'vitest';
import { chooseAnotherProject, toSessionChoices } from './session-choices';
import {
  firstAgent,
  input,
  mainProject,
  projectBaseBranch,
  secondAgent,
  worktreeProject,
} from './session-choices.mocks';

describe('toSessionChoices', () => {
  it('starts on the first Project and the first available Agent', () => {
    const choices = toSessionChoices(
      input({ agents: newSessionCatalogs.oneNotInstalled }),
    );
    expect([choices.project?.id, choices.agent?.agent]).toEqual([
      worktreeProject.id,
      secondAgent.agent,
    ]);
  });

  it('starts on the first Agent when none is available', () => {
    const choices = toSessionChoices(
      input({ agents: newSessionCatalogs.bothUnavailable }),
    );
    expect(choices.agent?.agent).toBe(firstAgent.agent);
  });

  it('starts on the Project whose heading opened New Session', () => {
    const choices = toSessionChoices(
      input({ chosen: { projectId: mainProject.id } }),
    );
    expect(choices.project?.id).toBe(mainProject.id);
  });

  it('falls back to the first Project when the chosen one is gone', () => {
    const choices = toSessionChoices(
      input({ chosen: { projectId: 'deleted-project' } }),
    );
    expect(choices.project?.id).toBe(worktreeProject.id);
  });

  it('opens the chosen Agent', () => {
    const choices = toSessionChoices(
      input({ chosen: { agent: secondAgent.agent } }),
    );
    expect(choices.agent?.agent).toBe(secondAgent.agent);
  });

  it.each([
    {
      case: "a worktree Project's base branch",
      chosen: {},
      branches: undefined,
      expected: {
        inNewWorktree: true,
        baseBranch: projectBaseBranch,
        baseBranchLoaded: true,
      },
    },
    {
      case: "a main Project's own checkout, before its branches load",
      chosen: { projectId: mainProject.id },
      branches: undefined,
      expected: { inNewWorktree: false, baseBranchLoaded: false },
    },
    {
      case: "a main Project's current branch once its branches load",
      chosen: { projectId: mainProject.id, newWorktree: true },
      branches: { branches: ['main', 'release'], currentBranch: 'release' },
      expected: {
        inNewWorktree: true,
        baseBranch: 'release',
        baseBranchLoaded: true,
      },
    },
  ])('checks out $case', ({ chosen, branches, expected }) => {
    expect(toSessionChoices(input({ chosen, branches }))).toMatchObject(
      expected,
    );
  });
});

describe('chooseAnotherProject', () => {
  it("drops the last Project's checkout choice, so the next starts from its own", () => {
    const chosen = chooseAnotherProject(
      { projectId: worktreeProject.id, newWorktree: true },
      mainProject.id,
    );
    expect(chosen).toEqual({
      projectId: mainProject.id,
      newWorktree: undefined,
    });
    expect(toSessionChoices(input({ chosen })).inNewWorktree).toBe(false);
  });
});
