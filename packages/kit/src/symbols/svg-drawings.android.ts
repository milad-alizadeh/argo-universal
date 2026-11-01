import type { ImageSourcePropType } from 'react-native';
import fileDiff from './assets/file-diff.xml';
import chevronRight from './assets/svg-drawings/chevron-right.xml';
import gitBranch from './assets/svg-drawings/git-branch.xml';
import gitCommit from './assets/svg-drawings/git-commit.xml';
import gitMerge from './assets/svg-drawings/git-merge.xml';
import gitPullRequestClosed from './assets/svg-drawings/git-pull-request-closed.xml';
import gitPullRequestConflict from './assets/svg-drawings/git-pull-request-conflict.xml';
import gitPullRequestDraft from './assets/svg-drawings/git-pull-request-draft.xml';
import gitPullRequest from './assets/svg-drawings/git-pull-request.xml';
import type { SvgSymbolName } from './svg-symbols';

/*
 * An SVG icon as an Android vector drawable. A Compose row cannot hold the component, and a row's leading lane
 * shows nothing without a drawing, so its title would start left of its neighbours' (#1757). Expo UI reads a
 * drawable's fill and ignores its stroke (expo/expo ImageLoader.kt), so each file fills the outline its component
 * strokes; `pnpm generate:svg-drawings` in the kit writes them and the parity test checks them.
 */
const drawings = {
  'chevron-right': chevronRight,
  'file-diff': fileDiff,
  'git-branch': gitBranch,
  'git-commit': gitCommit,
  'git-merge': gitMerge,
  'git-pull-request': gitPullRequest,
  'git-pull-request-closed': gitPullRequestClosed,
  'git-pull-request-conflict': gitPullRequestConflict,
  'git-pull-request-draft': gitPullRequestDraft,
} as const satisfies Record<SvgSymbolName, number>;

export const svgDrawing = (name: SvgSymbolName): ImageSourcePropType =>
  drawings[name];
