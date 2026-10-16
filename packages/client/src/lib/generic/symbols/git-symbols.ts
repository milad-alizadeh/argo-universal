import type { SymbolSource } from './symbol-source';

/*
 * Branches, pull requests and changes use Tabler Icons (MIT); `repository` uses GitHub's Octicons mark (MIT).
 * Every platform draws the same paths (ADR-0019).
 */
export const gitSymbols = {
  branch: { tabler: 'git-branch' },
  diff: { tabler: 'file-diff' },
  merged: { tabler: 'git-merge' },
  'pull-request': { tabler: 'git-pull-request' },
  'pr-open': { tabler: 'git-pull-request' },
  'pr-draft': { tabler: 'git-pull-request-draft' },
  'pr-merged': { tabler: 'git-merge' },
  'pr-closed': { tabler: 'git-pull-request-closed' },
  'pr-conflict': { tabler: 'git-pull-request-conflict' },
  repository: { tabler: 'brand-github' },
} as const satisfies Record<string, SymbolSource>;
