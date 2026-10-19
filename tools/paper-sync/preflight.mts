import type { PaperClient } from './client.mts';
import type { DesignNode } from './model.mts';
import { htmlFor } from './node-html.mts';
import type { SyncPlan } from './plan-types.mts';
import { readSnapshot } from './read.mts';
import { checkTokens, readTokens } from './tokens.mts';

async function checkNested(
  client: PaperClient,
  plan: SyncPlan,
  node: DesignNode,
): Promise<void> {
  const snapshot = await readSnapshot(client, plan.master.fileId, node.id);

  for (const child of snapshot.nodes) htmlFor(child);
  checkTokens(
    snapshot,
    await readTokens(client, snapshot.fileId),
    await readTokens(client, plan.before.fileId),
  );
}

export async function preflightInsertions(
  client: PaperClient,
  plan: SyncPlan,
): Promise<void> {
  for (const creation of plan.creates) {
    if (creation.node.nested) await checkNested(client, plan, creation.node);
    else htmlFor(creation.node);
  }
}
