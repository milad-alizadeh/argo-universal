import type { TreePatch } from '@repo/contracts/plugins/optimistic-tree';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { pacing, type Answer, type Kept } from './page-answer';

/*
 * A kept tree with a patch applied, as an Operation call's optimistic props are. A tree the patch leaves as
 * it was is the same answer, hash and all; a patched one has no hash, since the Server never drew it.
 */
export const patchedAnswer =
  (patch: TreePatch) =>
  (answer: Answer | undefined): Answer | undefined =>
    answer?.ok ? patchedKept(answer, patch) : answer;

function patchedKept(kept: Kept, patch: TreePatch): Answer {
  const root = patch(kept.root);

  return root === kept.root
    ? kept
    : { ok: true, root, pages: kept.pages, ...pacing(kept) };
}

type Cached = { client: QueryClient; queryKey: QueryKey };

/*
 * The answer kept at `queryKey` patched at once, its read in flight cancelled first so an answer read before the
 * patch cannot paint over it.
 */
export async function patchedAt<Data>(
  { client, queryKey }: Cached,
  patched: (answer: Data | undefined) => Data | undefined,
): Promise<void> {
  await client.cancelQueries({ queryKey, exact: true });

  client.setQueryData<Data>(queryKey, patched);
}

/*
 * The answer kept at `queryKey` patched again, as a patch that takes an earlier one back is. Reads in flight are
 * left to land: they are newer than the patch, and a tree they draw has none of it.
 */
export function unpatchedAt<Data>(
  { client, queryKey }: Cached,
  patched: (answer: Data | undefined) => Data | undefined,
): void {
  client.setQueryData<Data>(queryKey, patched);
}
