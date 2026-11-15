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

const argoIssues = (): FixtureIssue[] => [
  {
    key: 'ARGO-3',
    summary: 'Show Jira issues in Argo',
    status: { name: 'In Progress', category: 'indeterminate' },
    assignee: ada,
    priority: 'High',
  },
  {
    key: 'ARGO-2',
    summary: 'Sign in with a scoped API token',
    status: { name: 'Done', category: 'done' },
    assignee: ada,
    priority: 'Medium',
  },
  {
    key: 'ARGO-1',
    summary: 'Pick a Jira project for each Argo Project',
    status: { name: 'To Do', category: 'new' },
    assignee: null,
    priority: null,
  },
];

export function jiraData(): JiraData {
  return {
    sites: [
      {
        ...arenaSite,
        projects: [
          { id: '10000', key: 'ARGO', name: 'Argo', issues: argoIssues() },
          { id: '10001', key: 'QUIET', name: 'Quiet project', issues: [] },
        ],
      },
      {
        ...sideSite,
        projects: [
          {
            id: '20000',
            key: 'SIDE',
            name: 'Side project',
            issues: [
              {
                key: 'SIDE-1',
                summary: 'A side issue',
                status: { name: 'To Do', category: 'new' },
                assignee: null,
                priority: 'Low',
              },
            ],
          },
        ],
      },
    ],
    tokens: [
      { ...person, token: scopedToken, scoped: true },
      { ...person, token: unscopedToken, scoped: false },
    ],
  };
}
