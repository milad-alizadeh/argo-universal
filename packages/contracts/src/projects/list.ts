import { z } from 'zod';
import { projectColumns } from '../columns';
import { SessionCheckoutChoice } from '../sessions/new';

export const ProjectCheckoutChoice = SessionCheckoutChoice;

export type ProjectCheckoutChoice = z.infer<typeof ProjectCheckoutChoice>;

export const ProjectInfo = z.strictObject({
  ...projectColumns.shape,
  checkoutChoice: ProjectCheckoutChoice,
  // Where the origin remote is hosted, named for people, such as "GitHub"; null without a hosted origin.
  remoteHost: z.string().min(1).nullable(),
  // The Project's folder is still on the Server.
  folderExists: z.boolean(),
});

export type ProjectInfo = z.infer<typeof ProjectInfo>;

export const ProjectsListOutput = z.array(ProjectInfo);

export type ProjectsListOutput = z.infer<typeof ProjectsListOutput>;
