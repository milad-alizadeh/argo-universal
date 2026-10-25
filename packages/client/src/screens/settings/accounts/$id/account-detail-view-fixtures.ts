import type { AccountDetailLoad } from './account-detail-view';

export const issuesBorrower = {
  pluginId: 'github-issues',
  name: 'GitHub Issues',
};

export const pullRequestsBorrower = {
  pluginId: 'github-pull-requests',
  name: 'Pull requests',
};

export const sharedAccount = {
  status: 'loaded',
  host: 'api.github.com',
  provider: 'GitHub',
  borrowers: [issuesBorrower, pullRequestsBorrower],
  refused: [],
} satisfies AccountDetailLoad;

export const refusedAccount = {
  ...sharedAccount,
  borrowers: [issuesBorrower],
  refused: [pullRequestsBorrower],
} satisfies AccountDetailLoad;

export const unsharedAccount = {
  ...sharedAccount,
  borrowers: [],
} satisfies AccountDetailLoad;
