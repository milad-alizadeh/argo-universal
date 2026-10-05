import { z } from 'zod';
import { projectColumns } from '../columns';
import { CheckoutChoice } from '../sessions/new';

// The stored choice will be added to the Project by the starting-a-Session work.
export const ProjectCheckoutChoice = z.discriminatedUnion('type', [
  z.strictObject({
    type: CheckoutChoice.extract(['worktree']),
    baseBranch: z.string(),
  }),
  z.strictObject({ type: CheckoutChoice.extract(['main']) }),
]);
export type ProjectCheckoutChoice = z.infer<typeof ProjectCheckoutChoice>;

export const ProjectInfo = z.strictObject({
  ...projectColumns.shape,
  checkoutChoice: ProjectCheckoutChoice,
});
export type ProjectInfo = z.infer<typeof ProjectInfo>;

export const ProjectsListOutput = z.array(ProjectInfo);
export type ProjectsListOutput = z.infer<typeof ProjectsListOutput>;
