import { z } from 'zod';
import { projectColumns } from '../columns';
import { ProjectCheckoutChoice } from './list';

// Only what the call names changes.
export const ProjectUpdateInput = z.strictObject({
  projectId: projectColumns.shape.id,
  checkoutChoice: ProjectCheckoutChoice.optional(),
  deleteWorktreeOnArchive: z.boolean().optional(),
});

export type ProjectUpdateInput = z.infer<typeof ProjectUpdateInput>;
