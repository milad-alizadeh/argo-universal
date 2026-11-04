import type { WireNode } from '@repo/contracts/plugins/wire';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
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

/*
 * The answer kept at `queryKey` patched at once, its read in flight cancelled first so an answer read before the
 * patch cannot paint over it; the function returned puts the answer back as it was.
 */
export async function patchedAt<Data>(
  { client, queryKey }: { client: QueryClient; queryKey: QueryKey },
  patched: (answer: Data | undefined) => Data | undefined,
): Promise<() => void> {
  await client.cancelQueries({ queryKey, exact: true });

  const before = client.getQueryData<Data>(queryKey);

  client.setQueryData<Data>(queryKey, patched);

  return () => client.setQueryData(queryKey, before);
}
