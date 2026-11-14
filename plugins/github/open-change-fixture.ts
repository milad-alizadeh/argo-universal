import { sha } from './github-fixture';

// The Change the Plugin gives pull request 12 of the Project's repository, as the fixture GitHub describes it.
export const openChange = {
  id: 'github:owner/repository#12',
  stage: 'open',
  title: 'Add the thing',
  provider: 'github',
  repository: 'owner/repository',
  branch: 'feature-12',
  base: 'main',
  headRepository: 'owner/repository',
  head: sha,
  pullRequest: {
    number: 12,
    url: 'https://github.com/owner/repository/pull/12',
  },
  onCheckout: true,
  totals: { files: 3, additions: 10, deletions: 2 },
  checks: [],
};
