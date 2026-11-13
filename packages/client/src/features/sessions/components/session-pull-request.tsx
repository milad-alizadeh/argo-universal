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
  // Both facts the Plugin reported; only one modifier is drawn, so a view that draws both reads these.
  draft?: boolean;
  conflict?: boolean;
  /*
   * Set when the latest refresh failed and the rest is what was last known: because the person must sign in, or for
   * another reason. No view draws it yet; it needs a design.
   */
  stale?: 'signIn' | 'failed';
  summary?: ChangesSummary;
  mergeable: boolean;
};
