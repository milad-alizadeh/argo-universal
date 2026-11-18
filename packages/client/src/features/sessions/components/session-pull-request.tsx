import type {
  Change,
  ChangeAutomationKind,
  ChangesSummary,
  ChangeStaleReason,
} from '@repo/contracts';
import type { ChangeState } from './change-stage/change-stage-model';
import type { PullRequestChecksProps } from './pull-request-checks';

// One of a Session's Changes, shown by its Workbench.
export type SessionPullRequest = ChangeState & {
  // Repository plus number, as the Plugin that supplied it names it; absent in stories, where the number alone tells Changes apart.
  id?: string;
  // The repository the PR belongs to, as `owner/name`; with the number it is the PR's identity.
  repository?: string;
  // Where the PR is on its code host, a Workbench row opens it.
  url?: string;
  // The PR's branch and the one it merges into.
  branch?: string;
  base?: string;
  // The PR's head commit, which a push moves; what its files were read at.
  head?: string;
  number: number;
  title: string;
  checks?: PullRequestChecksProps;
  // Set when the latest refresh failed and the rest is what was last known: because the person must sign in, or for another reason.
  stale?: ChangeStaleReason;
  // The Plugin says this is the same line of work as the Session's Checkout, so its totals are the Checkout's too.
  onCheckout?: true;
  summary?: ChangesSummary;
  mergeable: boolean;
  // What the row's … menu does besides open the PR; a row without a handler leaves that item out.
  onCopyLink?: () => void;
  onDetach?: () => void;
  // Opens the Checkout's Changes against main; set only for the Change on the Checkout, whose totals then press.
  onOpenFiles?: () => void;
  // What the Plugin offers to turn on for this PR; the menu draws an item for each that works or says why it does not.
  automation?: Change['automation'];
  // Ticks or unticks one of them; the menu leaves the automation items out without it.
  onSetAutomation?: (kind: ChangeAutomationKind, on: boolean) => void;
};
