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
 * An SVG icon as an Android vector drawable, the same paths as its component in svg-symbols. A Compose row cannot
 * hold the component, and a row's leading lane shows nothing without a drawing, so its title would start left of
 * its neighbours' (#1757). Keep each file's paths equal to its component's.
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
