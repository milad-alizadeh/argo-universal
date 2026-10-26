import type { ProjectAccountsProps } from './project-detail-accounts';

type Hosts = ProjectAccountsProps['hosts'];

const githubProvider = 'GitHub';

const githubHost = 'api.github.com';

const github = [
  { id: 'account-github-1', label: 'milad-alizadeh', provider: githubProvider },
  { id: 'account-github-2', label: 'argo-work', provider: githubProvider },
];

const linearAccount = 'account-linear-1';

const linear = [{ id: linearAccount, label: 'Milad', provider: 'Linear' }];

// Every host has a chosen Account.
export const chosenAccounts = [
  { host: githubHost, accounts: github, chosen: 'account-github-1' },
  { host: 'api.linear.app', accounts: linear, chosen: linearAccount },
] satisfies Hosts;

// One host has two Accounts and the Project has chosen neither yet.
export const unchosenAccounts = [
  { host: githubHost, accounts: github },
  { host: 'api.linear.app', accounts: linear, chosen: linearAccount },
] satisfies Hosts;
