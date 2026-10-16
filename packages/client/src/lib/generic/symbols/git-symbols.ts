import type { SymbolSource } from './symbol-source';

/*
 * Branches, pull requests and changes. One set on every platform, Tabler Icons (MIT, assets/tabler), drawn from the
 * same paths on iOS, Android, web and the desktop app (ADR-0019).
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
} as const satisfies Record<string, SymbolSource>;
