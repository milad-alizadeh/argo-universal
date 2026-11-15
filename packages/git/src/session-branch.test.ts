import { describe, expect, it } from 'vitest';
import {
  isSessionBranch,
  sessionBranch,
  sessionBranchOwner,
  worktreeName,
} from './session-branch';

const id = 'e03c46d8-ed50-4766-9ef2-68a2bab11c32';

describe('worktreeName', () => {
  it('is readable and always the same for a Session id', () => {
    expect(worktreeName(id)).toMatch(/^[a-z]+-[a-z]+-[0-9a-z]{6}$/);
    expect(worktreeName(id)).toBe(worktreeName(id));
    expect(worktreeName(id)).not.toContain(id);
  });

  it('differs between Session ids', () => {
    expect(worktreeName(id)).not.toBe(
      worktreeName('e03c46d8-ed50-4766-9ef2-68a2bab11c33'),
    );
  });
});

describe('worktreeName without letters or digits in the id', () => {
  it('still ends in a suffix', () => {
    expect(worktreeName('---')).toMatch(/^[a-z]+-[a-z]+-[0-9a-z]+$/);
  });
});

describe('Session branch', () => {
  it('names the branch for the worktree', () => {
    expect(sessionBranch(id)).toBe(`argo/${worktreeName(id)}`);
    expect(sessionBranchOwner(sessionBranch(id))).toBe(worktreeName(id));
  });

  it('still owns a branch made with the Session id', () => {
    expect(isSessionBranch(`argo/${id}`, id)).toBe(true);
    expect(isSessionBranch(sessionBranch(id), id)).toBe(true);
    expect(isSessionBranch('argo/other', id)).toBe(false);
    expect(isSessionBranch(null, id)).toBe(false);
  });
});
