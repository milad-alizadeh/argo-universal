import { z } from 'zod';
import { projectColumns } from '../columns';

export const ProjectsBranchesInput = z.strictObject({
  projectId: projectColumns.shape.id,
});
export type ProjectsBranchesInput = z.infer<typeof ProjectsBranchesInput>;

export const ProjectsBranchesOutput = z.strictObject({
  branches: z.array(z.string()),
  currentBranch: z.string().nullable(),
});
export type ProjectsBranchesOutput = z.infer<typeof ProjectsBranchesOutput>;
