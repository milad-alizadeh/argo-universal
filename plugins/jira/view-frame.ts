import type { PageTo } from '@argo/plugin-kit';

// What a site picker types before it is added: Page state, as it is no secret.
export type ProjectState = { site: string };

export type ProjectTo = PageTo<ProjectState>;

// What every view of one Argo Project knows besides Jira's answer.
export type Framing = {
  projectId: string;
  to: ProjectTo;
  state: ProjectState;
  sitePath: string;
};
