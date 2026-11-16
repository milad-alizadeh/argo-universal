import type { PagedList, PageTo } from '@argo/plugin-kit';
import type { IssueFilters } from './jira-filters';
import type { JiraIssue } from './jira-readers';

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

// The issues page's Page state: the site picker's text, shown while no site is chosen, and the filters.
export type IssuesState = ProjectState & IssueFilters;

// What the issues view draws besides Jira's answer: the filters it was read for, and the pages the kit has read.
export type Listing = {
  to: PageTo<IssuesState>;
  filters: IssueFilters;
  list: PagedList<JiraIssue>;
};
