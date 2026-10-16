import type { SymbolSource } from './symbol-source';

/*
 * Branches, pull requests and changes. One set on every platform, Tabler Icons (MIT, assets/tabler), drawn from the
 * same paths on iOS, Android, web and the desktop app (ADR-0019).
 */
export const gitSymbols = {
  branch: { sf: 'custom.git-branch' },
  diff: { sf: 'custom.file-diff' },
  merged: { sf: 'custom.git-merge' },
  'pull-request': { sf: 'custom.git-pull-request' },
  'pr-open': { sf: 'custom.git-pull-request' },
  'pr-draft': { sf: 'custom.git-pull-request-draft' },
  'pr-merged': { sf: 'custom.git-merge' },
  'pr-closed': { sf: 'custom.git-pull-request-closed' },
  'pr-conflict': { sf: 'custom.git-pull-request-conflict' },
} as const satisfies Record<string, SymbolSource>;
