import { z } from 'zod';

// The stages a Change moves through, in order (ADR-0039).
export const changeStages = [
  'working',
  'branch',
  'open',
  'merged',
  'closed',
] as const;

export type ChangeStage = (typeof changeStages)[number];

const identityLimit = 300;

const nameLimit = 250;

const providerLimit = 40;

const shortestHead = 7;

const longestHead = 64;

// Every Plugin's Changes show; far above what a Session produces, and not a preview (the card previews three, ADR-0039).
const changesShown = 100;

export const sessionChangesLimit = {
  phone: changesShown,
  desktop: changesShown,
  perPlugin: changesShown,
};

// How often Argo asks the Plugins for a Session's Changes again while an App has them open (ADR-0052).
export const sessionChangesRefreshMs = 30_000;

// How the Changes Slot is drawn and kept: its limits, and how often Argo asks again while an App has it open (ADR-0052).
export const sessionChangesSlot = {
  limit: sessionChangesLimit,
  refreshMs: sessionChangesRefreshMs,
};

// How one Check stands: still queued or running, passed, or failed. A Check that is not known is not listed.
export const changeCheckStates = ['running', 'passed', 'failed'] as const;

export type ChangeCheckState = (typeof changeCheckStates)[number];

const ChangeCheck = z.strictObject({
  name: z.string().trim().min(1).max(identityLimit),
  state: z.enum(changeCheckStates),
});

// Why a Change shows what it last knew: its latest read failed, because the person must sign in or for any other reason.
export const changeStaleReasons = ['signIn', 'failed'] as const;

export type ChangeStaleReason = (typeof changeStaleReasons)[number];

/*
 * The pull request behind a Change, where it has one. Its repository is the Change's `repository`, so a PR is
 * always identified by repository plus number, never by number alone (ADR-0052).
 */
const ChangePullRequest = z.strictObject({
  number: z.int().positive(),
  url: z.url({ protocol: /^https$/ }),
});

// The same three counts as a Session's own totals (`ChangesSummary`); kept here so the Slot's schema loads alone.
const ChangeTotals = z.strictObject({
  files: z.int(),
  additions: z.int(),
  deletions: z.int(),
});

/*
 * One of a Session's Changes as a Plugin supplies it to the Changes Slot (ADR-0052). Working and Branch Changes need
 * no number, repository or provider; a PR-backed one carries all three. Every field after `title` is optional so a later
 * increment (Checks, files) adds fields without breaking a Plugin that already answers.
 */
export const Change = z
  .strictObject({
    // Stable for the Change's life and unique within the answering Plugin, such as `github:owner/name#12`.
    id: z.string().trim().min(1).max(identityLimit),
    stage: z.enum(changeStages),
    title: z.string().trim().min(1).max(identityLimit),
    // The code host the Change lives on, such as `github`.
    provider: z.string().trim().min(1).max(providerLimit).optional(),
    // The repository the Change belongs to, such as `owner/name`; for a fork PR, the repository it targets.
    repository: z.string().trim().min(1).max(nameLimit).optional(),
    branch: z.string().min(1).max(nameLimit).optional(),
    // The repository `branch` is in: a fork's, for a pull request from a fork. With `branch` it is the Change's head identity.
    headRepository: z.string().trim().min(1).max(nameLimit).optional(),
    base: z.string().min(1).max(nameLimit).optional(),
    head: z.string().min(shortestHead).max(longestHead).optional(),
    pullRequest: ChangePullRequest.optional(),
    // Set when this is the same line of work as the Session's Checkout: its head is the Checkout's repository and branch (ADR-0052).
    onCheckout: z.literal(true).optional(),
    // Both can hold at once: a draft PR may also conflict.
    draft: z.boolean().optional(),
    conflict: z.boolean().optional(),
    totals: ChangeTotals.optional(),
    /*
     * The individual Checks of the head commit. Absent means they are not known, which is never the same as passed;
     * an empty list means the code host reports none.
     */
    checks: z.array(ChangeCheck).max(changesShown).optional(),
    // Set when the latest read of this Change failed: everything else is what was last known, and why it is out of date.
    stale: z.enum(changeStaleReasons).optional(),
  })
  .refine(({ pullRequest, repository }) => !pullRequest || !!repository, {
    message: 'A pull request is identified by its repository and number',
    path: ['repository'],
  });

export type Change = z.infer<typeof Change>;
