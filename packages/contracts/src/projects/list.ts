import { z } from 'zod';
import { projectColumns } from '../columns';
import { SessionCheckoutChoice } from '../sessions/new';

export const ProjectCheckoutChoice = SessionCheckoutChoice;
export type ProjectCheckoutChoice = z.infer<typeof ProjectCheckoutChoice>;

export const ProjectInfo = z.strictObject({
  ...projectColumns.shape,
  checkoutChoice: ProjectCheckoutChoice,
});
export type ProjectInfo = z.infer<typeof ProjectInfo>;

export const ProjectsListOutput = z.array(ProjectInfo);
export type ProjectsListOutput = z.infer<typeof ProjectsListOutput>;
