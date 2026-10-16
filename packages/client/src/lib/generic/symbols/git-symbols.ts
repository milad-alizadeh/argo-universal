import type { SymbolSource } from './symbol-source';

/*
 * Branches and pull requests. A PR's state draws as GitHub draws it: SF Symbols has no such set, so Apple platforms
 * draw GitHub's Octicons (MIT) as custom symbols; Material Symbols has none either, so Android and web keep the
 * nearest Material names.
 */
export const gitSymbols = {
  branch: { sf: 'arrow.triangle.branch', material: 'alt_route' },
  'pull-request': { sf: 'arrow.triangle.pull', material: 'fork_left' },
  'pr-open': { sf: 'custom.pr-open', material: 'fork_left' },
  'pr-draft': { sf: 'custom.pr-draft', material: 'fork_left' },
  'pr-merged': { sf: 'custom.pr-merged', material: 'merge' },
  'pr-closed': { sf: 'custom.pr-closed', material: 'fork_left' },
  'pr-conflict': { sf: 'custom.pr-conflict', material: 'warning' },
} as const satisfies Record<string, SymbolSource>;
