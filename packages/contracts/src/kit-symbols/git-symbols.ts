/*
 * Branches, pull requests and changes are small SVG components every platform draws the same (ADR-0041); the rest
 * name SF and Material symbols. The GitHub mark is a logo, drawn by Icon's `source`, not a symbol name.
 */
export const gitSymbols = {
  pencil: { sf: 'pencil', material: 'edit' },
  workbench: {
    sf: 'list.clipboard',
    sfFilled: 'list.clipboard.fill',
    material: 'assignment',
  },
  stage: {
    sf: 'sidebar.right',
    sfFilled: 'rectangle.rightthird.inset.filled',
    material: 'right_panel_open',
  },
  commit: { svg: 'git-commit' },
  'git-issue-open': { sf: 'smallcircle.filled.circle', material: 'adjust' },
  'git-issue-closed': { sf: 'checkmark.circle', material: 'check_circle' },
  branch: { svg: 'git-branch' },
  diff: { svg: 'file-diff' },
  merged: { svg: 'git-merge' },
  'pull-request': { svg: 'git-pull-request' },
  'pr-open': { svg: 'git-pull-request' },
  'pr-draft': { svg: 'git-pull-request-draft' },
  'pr-merged': { svg: 'git-merge' },
  'pr-closed': { svg: 'git-pull-request-closed' },
  'pr-conflict': { svg: 'git-pull-request-conflict' },
} as const;
