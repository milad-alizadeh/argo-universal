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
    base: z.string().min(1).max(nameLimit).optional(),
    head: z.string().min(shortestHead).max(longestHead).optional(),
    pullRequest: ChangePullRequest.optional(),
    // Both can hold at once: a draft PR may also conflict.
    draft: z.boolean().optional(),
    conflict: z.boolean().optional(),
    totals: ChangeTotals.optional(),
  })
  .refine(({ pullRequest, repository }) => !pullRequest || !!repository, {
    message: 'A pull request is identified by its repository and number',
    path: ['repository'],
  });

export type Change = z.infer<typeof Change>;
