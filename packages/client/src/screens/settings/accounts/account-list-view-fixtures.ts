import type { AccountRow } from './account-list-view';

export const githubAccount: AccountRow = {
  id: 'acc-github-1',
  host: 'api.github.com',
  label: 'milad-alizadeh',
  provider: 'GitHub',
};

export const secondGithubAccount: AccountRow = {
  id: 'acc-github-2',
  host: 'api.github.com',
  label: 'argo-work',
  provider: 'GitHub',
};

export const linearAccount: AccountRow = {
  id: 'acc-linear-1',
  host: 'api.linear.app',
  label: 'Milad',
  provider: 'Linear',
};

export const accountRows: AccountRow[] = [
  githubAccount,
  secondGithubAccount,
  linearAccount,
];
