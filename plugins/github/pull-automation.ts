import type { PullInfo } from './pull-info';

// The merge methods GitHub names, in the order Auto-merge prefers them: squash, merge, rebase (ADR-0052).
export const mergeMethods = ['SQUASH', 'MERGE', 'REBASE'] as const;

export type MergeMethod = (typeof mergeMethods)[number];

// A pull request's auto-merge as GitHub reports it, and the id GraphQL names the pull request by; JSON all through.
export type AutoMergeInfo = { on: boolean; nodeId: string };

// What a repository allows: whether auto-merge is on at all, and which methods may merge.
export type MergeSettings = { allowed: boolean; methods: MergeMethod[] };

// One automation as the Change offers it.
export type AutomationState = {
  on: boolean;
  available: boolean;
  reason?: string;
};

export type AutomationOffer = {
  fix: AutomationState;
  merge: AutomationState;
  archive: AutomationState;
};

const notOpen = 'Only open pull requests can auto-merge';

const notAllowed = 'Not allowed in this repository';

const isDraft = "Draft pull requests can't auto-merge";

export type Reads = { autoMerge?: AutoMergeInfo; settings?: MergeSettings };

const knownOf = ({
  autoMerge,
  settings,
}: Reads): Required<Reads> | undefined =>
  autoMerge && settings ? { autoMerge, settings } : undefined;

const blockOf = (
  { draft }: Pick<PullInfo, 'draft'>,
  { allowed }: MergeSettings,
): string | undefined => {
  if (!allowed) return notAllowed;

  return draft ? isDraft : undefined;
};

function knownMerge(
  pull: Pick<PullInfo, 'draft'>,
  { autoMerge, settings }: Required<Reads>,
): AutomationState {
  const { on } = autoMerge;
  const reason = blockOf(pull, settings);

  return reason === undefined
    ? { on, available: true }
    : { on, available: false, reason };
}

/*
 * Auto-merge as the Change offers it. `on` is GitHub's own answer, never stored here. What GitHub has not told us is
 * never drawn as off: with either read unknown the item is unavailable with no reason, so the App draws nothing.
 */
export function mergeOf(
  pull: Pick<PullInfo, 'stage' | 'draft'>,
  reads: Reads,
): AutomationState {
  if (pull.stage !== 'open')
    return { on: false, available: false, reason: notOpen };

  const known = knownOf(reads);

  return known ? knownMerge(pull, known) : { on: false, available: false };
}

// The first method the repository allows, in the order squash, merge, rebase.
export const methodOf = ({ methods }: MergeSettings): MergeMethod => {
  const [first] = methods;

  if (!first) throw new Error('This repository allows no merge method.');

  return first;
};
