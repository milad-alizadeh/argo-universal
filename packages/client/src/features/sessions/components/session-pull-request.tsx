import type { ChangesSummary } from '@repo/contracts';
import type { ChangeState } from './change-stage/change-stage-model';
import type { PullRequestChecksProps } from './pull-request-checks';

// One of a Session's Changes, shown by its Workbench and Inspector.
export type SessionPullRequest = ChangeState & {
  // Repository plus number, as the Plugin that supplied it names it; absent in stories, where the number alone tells Changes apart.
  id?: string;
  // The repository the PR belongs to, as `owner/name`; with the number it is the PR's identity.
  repository?: string;
  // Where the PR is on its code host, for Open on GitHub.
  url?: string;
  // The PR's branch and the one it merges into.
  branch?: string;
  base?: string;
  number: number;
  title: string;
  checks?: PullRequestChecksProps;
  /*
   * Set when the latest refresh failed and the rest is what was last known: because the person must sign in, or for
   * another reason. No view draws it yet; it needs a design.
   */
  stale?: 'signIn' | 'failed';
  summary?: ChangesSummary;
  mergeable: boolean;
};
