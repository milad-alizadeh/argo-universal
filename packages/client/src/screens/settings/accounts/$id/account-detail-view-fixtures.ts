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
} satisfies AccountDetailLoad;

export const unsharedAccount = {
  ...sharedAccount,
  borrowers: [],
} satisfies AccountDetailLoad;
