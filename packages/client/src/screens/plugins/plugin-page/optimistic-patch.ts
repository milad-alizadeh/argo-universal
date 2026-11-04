import type { WireNode } from '@repo/contracts/plugins/wire';
import { pacing, type Answer, type Kept } from './page-answer';

/*
 * A kept tree with a patch applied, as an Operation call's optimistic props are. A tree the patch leaves as
 * it was is the same answer, hash and all; a patched one has no hash, since the Server never drew it.
 */
export const patchedAnswer =
  (patch: (root: WireNode) => WireNode) =>
  (answer: Answer | undefined): Answer | undefined =>
    answer?.ok ? patchedKept(answer, patch) : answer;

function patchedKept(kept: Kept, patch: (root: WireNode) => WireNode): Answer {
  const root = patch(kept.root);

  return root === kept.root
    ? kept
    : { ok: true, root, pages: kept.pages, ...pacing(kept) };
}
