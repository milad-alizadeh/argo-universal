import type { PaperClient } from './client.mts';
import { type DesignNode } from './model.mts';
import type { SyncPlan } from './plan-types.mts';
import { readSnapshot } from './read.mts';
import { checkTokens, readTokens } from './tokens.mts';

type Insert = (
  client: PaperClient,
  plan: SyncPlan,
  node: DesignNode,
) => Promise<string>;

export async function createNested(
  context: { client: PaperClient; plan: SyncPlan; insert: Insert },
  node: DesignNode,
): Promise<void> {
  const { client, plan, insert } = context;
  const snapshot = await readSnapshot(client, plan.master.fileId, node.id);

  checkTokens(
    snapshot,
    await readTokens(client, snapshot.fileId),
    await readTokens(client, plan.before.fileId),
  );

  for (const child of snapshot.nodes)
    plan.binding.nodes[child.id] = await insert(client, plan, child);
}
