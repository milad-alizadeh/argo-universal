import type { ChangesSummary } from '@repo/contracts';
import type { ChangeState } from './change-stage/change-stage-model';
import type { PullRequestChecksProps } from './pull-request-checks';

// One of a Session's Changes, shown by its Workbench and Inspector.
export type SessionPullRequest = ChangeState & {
  // Repository plus number, as the Plugin that supplied it names it; absent in stories, where the number alone tells Changes apart.
  id?: string;
  // Where the PR is on its code host, for Open on GitHub.
  url?: string;
  number: number;
  title: string;
  checks?: PullRequestChecksProps;
  summary?: ChangesSummary;
  mergeable: boolean;
};
