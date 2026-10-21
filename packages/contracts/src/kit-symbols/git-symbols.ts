/*
 * Branches, pull requests and changes use Tabler Icons (MIT); every platform draws the same paths (ADR-0019).
 * The GitHub mark is a logo, drawn by Icon's `source`, not a symbol name.
 */
export const gitSymbols = {
  pencil: { tabler: 'pencil' },
  workbench: { tabler: 'clipboard-list' },
  stage: { tabler: 'layout-sidebar-right' },
  commit: { tabler: 'git-commit' },
  'git-issue-open': { tabler: 'circle-dot' },
  'git-issue-closed': { tabler: 'circle-check' },
  branch: { tabler: 'git-branch' },
  diff: { tabler: 'file-diff' },
  merged: { tabler: 'git-merge' },
  'pull-request': { tabler: 'git-pull-request' },
  'pr-open': { tabler: 'git-pull-request' },
  'pr-draft': { tabler: 'git-pull-request-draft' },
  'pr-merged': { tabler: 'git-merge' },
  'pr-closed': { tabler: 'git-pull-request-closed' },
  'pr-conflict': { tabler: 'git-pull-request-conflict' },
} as const;
