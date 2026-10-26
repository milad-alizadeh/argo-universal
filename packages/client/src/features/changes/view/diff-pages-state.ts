import type { FileDiffPages } from './changes-view-props';

export const idle = (diff: FileDiffPages): boolean =>
  !diff.loading && diff.loadError === undefined;

export const settled = (diff: FileDiffPages): boolean =>
  idle(diff) && !diff.more;
