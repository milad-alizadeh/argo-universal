import type { CheckDetail } from './pull-request-checks';
import type { SessionPullRequest } from './session-pull-request';

const passedChecks = [
  { name: 'Lint', state: 'passed' },
  { name: 'Typecheck', state: 'passed' },
  { name: 'Unit tests', state: 'passed' },
] satisfies CheckDetail[];

// A Session's PR with its checks running, failing or passed.
const sessionPullRequest = {
  number: 45,
  title: 'Build the Session layout from spec 0003',
  stage: 'open',
  mergeable: false,
} satisfies SessionPullRequest;

export const pullRequestMocks = {
  checksRunning: {
    ...sessionPullRequest,
    summary: { files: 6, additions: 168, deletions: 42 },
    checks: {
      passed: 3,
      failing: 0,
      running: 2,
      total: 5,
      details: [
        ...passedChecks,
        { name: 'E2E web', state: 'running' },
        { name: 'E2E iOS', state: 'running' },
      ],
    },
  },
  checksFailing: {
    ...sessionPullRequest,
    summary: { files: 2, additions: 32, deletions: 8 },
    checks: {
      passed: 4,
      failing: 1,
      running: 0,
      total: 5,
      details: [
        ...passedChecks,
        { name: 'E2E web', state: 'passed' },
        { name: 'E2E iOS', state: 'failing' },
      ],
    },
  },
  checksPassed: {
    ...sessionPullRequest,
    summary: { files: 3, additions: 67, deletions: 11 },
    checks: {
      passed: 5,
      failing: 0,
      running: 0,
      total: 5,
      details: [
        ...passedChecks,
        { name: 'E2E web', state: 'passed' },
        { name: 'E2E iOS', state: 'passed' },
      ],
    },
    mergeable: true,
  },
  followUp: {
    number: 46,
    title: 'Wire the Inspector to the changed files',
    stage: 'open',
    modifier: 'draft',
    mergeable: false,
  },
  merged: { ...sessionPullRequest, number: 42, stage: 'merged' },
  closed: { ...sessionPullRequest, number: 41, stage: 'closed' },
} satisfies Record<string, SessionPullRequest>;

export const severalPullRequests: SessionPullRequest[] = [
  pullRequestMocks.checksRunning,
  {
    ...pullRequestMocks.checksFailing,
    number: 44,
    title: 'Draw the Shell output',
  },
  {
    ...pullRequestMocks.checksPassed,
    number: 43,
    title: 'Add the Inspector tab strip',
  },
  pullRequestMocks.followUp,
  pullRequestMocks.merged,
  pullRequestMocks.closed,
];

// Equal numbers in two repositories, a Change that is both a draft and in conflict, and one of each ended stage.
export const repositoryChanges = [
  {
    id: 'github:owner/app#12',
    repository: 'owner/app',
    url: 'https://github.com/owner/app/pull/12',
    branch: 'feature/inspector',
    base: 'main',
    number: 12,
    title: 'Add the Inspector list',
    stage: 'open',
    modifier: 'conflict',
    modifiers: ['draft', 'conflict'],
    mergeable: false,
    summary: { files: 4, additions: 40, deletions: 9 },
  },
  {
    id: 'github:fork/app#12',
    repository: 'fork/app',
    url: 'https://github.com/fork/app/pull/12',
    number: 12,
    title: 'Same number in a fork',
    stage: 'open',
    mergeable: true,
    summary: { files: 1, additions: 3, deletions: 0 },
  },
  {
    id: 'github:owner/app#9',
    repository: 'owner/app',
    number: 9,
    title: 'Earlier work, merged',
    stage: 'merged',
    mergeable: true,
  },
  {
    id: 'github:owner/app#7',
    repository: 'owner/app',
    number: 7,
    title: 'Abandoned attempt',
    stage: 'closed',
    mergeable: true,
  },
] satisfies SessionPullRequest[];
