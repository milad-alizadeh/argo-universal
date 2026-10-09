import { ProjectsBranchesOutput } from '@repo/contracts';
import { expect, it } from 'vitest';

it('keeps a Project branches mock aligned with the public contract', (): void => {
  const branches = { branches: ['main', 'feature'], currentBranch: 'feature' };
  expect(ProjectsBranchesOutput.parse(branches)).toEqual(branches);
});
