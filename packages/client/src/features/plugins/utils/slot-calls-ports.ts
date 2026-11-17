import type { TreePatch } from '@repo/contracts/plugins/optimistic-tree';
import type { PageCallsPorts } from '@repo/contracts/plugins/page-calls';
import type { ReplaceableAnswer } from '@repo/contracts/plugins/replaceable';
import type { WireNode } from '@repo/contracts/plugins/wire';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { patchedAt, unpatchedAt } from './optimistic-patch';
import { operationRunFor, type OperationRunner } from './page-calls-ports';

// The Session a Feed row is in, and its Project once the Session's Feed has said which it is.
export type SlotSession = { sessionId: string; projectId?: string };

// Where a Replaceable Slot's answer is kept: its own `plugins.render` query, by its props.
export type SlotAnswer = { client: QueryClient; queryKey: QueryKey };

const patchedReplacement =
  (patch: TreePatch) =>
  (answer: ReplaceableAnswer | undefined): ReplaceableAnswer | undefined =>
    answer?.type === 'replacement'
      ? { ...answer, root: patch(answer.root) }
      : answer;

const replacementIn = ({
  client,
  queryKey,
}: SlotAnswer): WireNode | undefined => {
  const answer = client.getQueryData<ReplaceableAnswer>(queryKey);

  return answer?.type === 'replacement' ? answer.root : undefined;
};

/*
 * What a Replaceable Slot's calls reach (ADR-0027, ADR-0050): the replacement kept in its own answer, and the
 * Plugin's Operation run for the Session the row is in. A replacement has no Page state, so an Operation run is
 * the one call it makes.
 */
export const slotCallsPorts = (
  answer: SlotAnswer,
  { pluginId, session }: { pluginId: string; session: SlotSession },
  { run, failed }: OperationRunner,
): PageCallsPorts => ({
  scope: session,
  shown: () => replacementIn(answer),
  patch: (patch) => patchedAt(answer, patchedReplacement(patch)),
  unpatch: (patch) => unpatchedAt(answer, patchedReplacement(patch)),
  run: operationRunFor(pluginId, run),
  failed,
});
