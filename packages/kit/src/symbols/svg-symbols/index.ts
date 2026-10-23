import type * as React from 'react';
import { ChevronRightIcon } from './chevron-right';
import { FileDiffIcon } from './file-diff';
import { GitBranchIcon } from './git-branch';
import { GitCommitIcon } from './git-commit';
import { GitMergeIcon } from './git-merge';
import { GitPullRequestIcon } from './git-pull-request';
import { GitPullRequestClosedIcon } from './git-pull-request-closed';
import { GitPullRequestConflictIcon } from './git-pull-request-conflict';
import { GitPullRequestDraftIcon } from './git-pull-request-draft';
import type { SvgSymbolProps } from './svg-symbol-frame';

export type { SvgSymbolProps } from './svg-symbol-frame';

/*
 * The icons SF Symbols and Material Symbols cannot draw: git's branches and pull request states, and the web's
 * grouped-row chevron. Each is a small react-native-svg component with its own paths, drawn the same on every
 * platform (ADR-0041). `git-symbols.ts` and `list-view-symbols.ts` map Argo icon names to these names.
 */
export const svgSymbols = {
  'chevron-right': ChevronRightIcon,
  'file-diff': FileDiffIcon,
  'git-branch': GitBranchIcon,
  'git-commit': GitCommitIcon,
  'git-merge': GitMergeIcon,
  'git-pull-request': GitPullRequestIcon,
  'git-pull-request-closed': GitPullRequestClosedIcon,
  'git-pull-request-conflict': GitPullRequestConflictIcon,
  'git-pull-request-draft': GitPullRequestDraftIcon,
} as const satisfies Record<
  string,
  (props: SvgSymbolProps) => React.JSX.Element
>;

export type SvgSymbolName = keyof typeof svgSymbols;
