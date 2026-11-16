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
  // In the Atlassian Document Format, as Jira answers it.
  description?: unknown;
  labels?: string[];
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
  // The people the site's projects may assign issues to; every site has `people()` unless a test says otherwise.
  people?: { accountId: string; displayName: string }[];
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

export const grace = {
  accountId: 'account-grace',
  displayName: 'Grace Hopper',
};

const paragraph = (text: string) => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});

// ARGO-3's description, as Jira's ADF: a paragraph with a bold mark, and a list.
export const argoThreeDescription = {
  type: 'doc',
  version: 1,
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'List a project’s issues ' },
        { type: 'text', text: 'in Argo', marks: [{ type: 'strong' }] },
        { type: 'text', text: '.' },
      ],
    },
    {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [paragraph('Key and summary')] },
        { type: 'listItem', content: [paragraph('Status and assignee')] },
      ],
    },
  ],
};

const argoIssues = (): FixtureIssue[] => [
  {
    key: 'ARGO-3',
    summary: 'Show Jira issues in Argo',
    status: { name: 'In Progress', category: 'indeterminate' },
    assignee: ada,
    priority: 'High',
    description: argoThreeDescription,
    labels: ['jira', 'spec-0027'],
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
