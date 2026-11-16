import type { AutomationState } from './pull-automation';
import type { PullInfo } from './pull-info';
import type { PullLink } from './pull-store';
import type { Pulls } from './pull-sync';

// What a Watch turn reads pull requests through, and says changed with: the Plugin's one way to read GitHub.
export type Fresh = {
  pulls: Pick<Pulls, 'sync' | 'known'>;
  changed: () => void;
};

// One attached pull request as it was last read, with the signed-in account when that is known.
export type Offered = { link: PullLink; pull: PullInfo; viewer?: string };

// How an automation is offered on one attached pull request.
export type Offers = (offered: Offered) => AutomationState;

/*
 * One of the Plugin's own automations on a Session's attached pull requests (ADR-0055). What it keeps, what it reads
 * from GitHub and when it acts stay inside; a caller only offers it, sets it, runs it on the Watch and forgets it.
 */
export type Automation = {
  // How the menu offers it on these Sessions' pull requests, read once for them all.
  offers: (sessionIds: readonly string[]) => Promise<Offers>;
  // A person's choice for one attached pull request. Turning on what is on changes nothing; a read it needs that fails refuses.
  set: (link: PullLink, on: boolean) => Promise<void>;
  // One Watch turn for a Project: each pull request with it on is read fresh and acted on. One failing does not stop the others.
  watch: (projectId: string, fresh: Fresh) => Promise<void>;
  // Drops everything kept for a pull request that is detached.
  forget: (link: PullLink) => Promise<void>;
};

// The automations the Plugin keeps itself; Auto-merge is GitHub's own and is never kept here.
export type Automations = { fix: Automation; archive: Automation };
