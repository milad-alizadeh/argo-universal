import type { ReplaceableAnswer } from '@repo/contracts/plugins/replaceable';
import type { QueryClient, QueryKey } from '@tanstack/react-query';

/*
 * A Replaceable Slot is answered once for its props (ADR-0050), so a Plugin's answer stays as it was drawn,
 * optimistic props and all, until the Server says the Plugin changed: it reloaded, or one of its Operations
 * ran. Its answers are then asked again, which puts back the tree the Plugin draws now; a mounted Slot asks
 * at once, one off screen when it comes back.
 */
export function staleSlotAnswers(
  client: QueryClient,
  renderKey: QueryKey,
  pluginId: string,
): void {
  void client.invalidateQueries({
    queryKey: renderKey,
    predicate: ({ state }) => {
      const answer = state.data as ReplaceableAnswer | undefined;

      return answer?.type === 'replacement' && answer.pluginId === pluginId;
    },
  });
}
