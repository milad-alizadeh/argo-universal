import { z } from 'zod';

// The five answers `github.discover` gives, each its own so an Agent or a person never reads one as another (ADR-0052).
export const changeDiscoveryResults = [
  'found',
  'no-match',
  'branchless',
  'not-github',
  'unavailable',
] as const;

export type ChangeDiscoveryResult = (typeof changeDiscoveryResults)[number];

/*
 * What the GitHub Plugin answers to `github.discover`, as the App reads it: the one schema for the answer, so the type the
 * App draws from cannot drift from what it parses. A Plugin has no schema to share, so its own type of the answer is
 * checked against this one by the journeys that run it.
 */
export const ChangeDiscovery = z.object({
  result: z.enum(changeDiscoveryResults),
  pullRequests: z.array(z.looseObject({})).default([]),
  branch: z.string().default(''),
  signIn: z.boolean().default(false),
});

export type ChangeDiscovery = z.infer<typeof ChangeDiscovery>;

// An attached pull request `github.list` or `github.refresh` could not read, with why.
export const ChangeUnread = z.object({
  repository: z.string(),
  number: z.number(),
  error: z.string(),
});

export type ChangeUnread = z.infer<typeof ChangeUnread>;
