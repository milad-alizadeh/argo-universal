/*
 * What the fixture Jira holds: two Atlassian sites, the people whose API tokens it accepts, and each site's projects
 * and issues. A test changes its own copy, from `jiraData()`, before or while it runs.
 */
export type FixtureIssue = {
  key: string;
  summary: string;
  status: { name: string; category: 'new' | 'indeterminate' | 'done' };
  assignee: { accountId: string; displayName: string } | null;
  priority: string | null;
};

export type FixtureProject = {
  id: string;
  key: string;
  name: string;
  issues: FixtureIssue[];
};

export type FixtureSite = {
  host: string;
  cloudId: string;
  projects: FixtureProject[];
};

// A token Atlassian issued: a scoped one opens api.atlassian.com, an unscoped one only the site itself.
export type FixtureToken = {
  email: string;
  token: string;
  scoped: boolean;
  accountId: string;
  displayName: string;
};

export type JiraData = { sites: FixtureSite[]; tokens: FixtureToken[] };

export const person = {
  email: 'ada@example.com',
  accountId: 'account-ada',
  displayName: 'Ada Lovelace',
};

// The scoped token the fixture accepts, and an unscoped one for the same person.
export const scopedToken = 'ATATT-scoped-4f2a9c';

export const unscopedToken = 'ATATT-unscoped-77b1';

export const arenaSite = {
  host: 'arena.atlassian.net',
  cloudId: 'cloud-arena',
};

export const sideSite = { host: 'side.atlassian.net', cloudId: 'cloud-side' };

const ada = { accountId: person.accountId, displayName: person.displayName };

const inProgress = { name: 'In Progress', category: 'indeterminate' } as const;

const done = { name: 'Done', category: 'done' } as const;

const toDo = { name: 'To Do', category: 'new' } as const;

// An issue as a row: key, summary, status, assignee and priority.
type IssueRow = [
  string,
  string,
  FixtureIssue['status'],
  FixtureIssue['assignee'],
  string | null,
];

const issueOf = ([
  key,
  summary,
  status,
  assignee,
  priority,
]: IssueRow): FixtureIssue => ({
  key,
  summary,
  status,
  assignee,
  priority,
});

const argoRows: IssueRow[] = [
  ['ARGO-3', 'Show Jira issues in Argo', inProgress, ada, 'High'],
  ['ARGO-2', 'Sign in with a scoped API token', done, ada, 'Medium'],
  ['ARGO-1', 'Pick a Jira project for each Argo Project', toDo, null, null],
];

const sideRows: IssueRow[] = [['SIDE-1', 'A side issue', toDo, null, 'Low']];

const arena = (): FixtureSite => ({
  ...arenaSite,
  projects: [
    { id: '10000', key: 'ARGO', name: 'Argo', issues: argoRows.map(issueOf) },
    { id: '10001', key: 'QUIET', name: 'Quiet project', issues: [] },
  ],
});

const side = (): FixtureSite => ({
  ...sideSite,
  projects: [
    {
      id: '20000',
      key: 'SIDE',
      name: 'Side project',
      issues: sideRows.map(issueOf),
    },
  ],
});

export const jiraData = (): JiraData => ({
  sites: [arena(), side()],
  tokens: [
    { ...person, token: scopedToken, scoped: true },
    { ...person, token: unscopedToken, scoped: false },
  ],
});
