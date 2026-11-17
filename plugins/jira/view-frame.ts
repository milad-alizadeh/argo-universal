import type { PagedList, PageTo } from '@argo/plugin-kit';
import type { JiraStatus } from './issue-fields';
import type { ListedItem } from './issue-pages';
import type { IssueFilters } from './jira-filters';

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

/*
 * The issues page's Page state: the site picker's text, shown while no site is chosen, the filters, and whether the
 * issues show as a list or a board.
 */
export type IssuesState = ProjectState & IssueFilters & { view: string };

export type IssuesTo = PageTo<IssuesState>;

// What the issues view draws besides Jira's answer: the filters it was read for, and the pages the kit has read.
export type Listing = {
  to: IssuesTo;
  filters: IssueFilters;
  list: PagedList<ListedItem>;
  // `board` shows the issues as a board, whose columns are `statuses`; anything else, as a list.
  view: string;
  statuses: JiraStatus[];
};
