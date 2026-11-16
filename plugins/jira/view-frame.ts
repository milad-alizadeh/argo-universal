import type { PageTo } from '@argo/plugin-kit';

// What a site picker types before it is added: Page state, as it is no secret.
export type ProjectState = { site: string };

export type ProjectTo = PageTo<ProjectState>;

// The issues page's Page state besides: whether they show as a list or a board.
export type IssuesState = ProjectState & { view: string };

export type IssuesTo = PageTo<IssuesState>;

// What every view of one Argo Project knows besides Jira's answer.
export type Framing = {
  projectId: string;
  to: ProjectTo;
  state: ProjectState;
  sitePath: string;
};

// The issues page's framing, whose Page state also holds the view.
export type IssuesFraming = Framing & { to: IssuesTo; state: IssuesState };
