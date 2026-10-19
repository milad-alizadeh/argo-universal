import type { PaperClient } from './client.mts';
import { required, type DesignNode, type Styles } from './model.mts';
import type { SyncPlan } from './plan-types.mts';

type StyleUpdate = { nodeIds: string[]; styles: Styles };

async function moveChildren(
  client: PaperClient,
  plan: SyncPlan,
  parent: DesignNode,
): Promise<void> {
  if (!parent.childIds.length) return;

  const moves = parent.childIds.map((sourceId, index) => ({
    nodeId: required(plan.binding.nodes[sourceId]),
    parentId: required(plan.binding.nodes[parent.id]),
    index,
  }));

  await client.call('move_nodes', { fileId: plan.before.fileId, moves });
}

function styleUpdates(plan: SyncPlan): StyleUpdate[] {
  return plan.styles
    .filter((edit) => !plan.svgReplacements.includes(edit.sourceId))
    .map((edit) => ({
      nodeIds: [required(plan.binding.nodes[edit.sourceId])],
      styles: edit.styles,
    }));
}

function styleBatch(updates: StyleUpdate[], clearing: boolean): StyleUpdate[] {
  return updates
    .values()
    .map((update) => ({
      ...update,
      styles: Object.fromEntries(
        Object.entries(update.styles).filter(
          ([, value]) => (value === '') === clearing,
        ),
      ),
    }))
    .filter((update) => Object.keys(update.styles).length)
    .toArray();
}

async function patchStyles(client: PaperClient, plan: SyncPlan): Promise<void> {
  const updates = styleUpdates(plan);

  for (const clearing of [true, false]) {
    const batch = styleBatch(updates, clearing);

    if (batch.length)
      await client.call('update_styles', {
        fileId: plan.before.fileId,
        updates: batch,
      });
  }
}

async function patchText(client: PaperClient, plan: SyncPlan): Promise<void> {
  if (!plan.texts.length) return;

  const updates = plan.texts.map((edit) => ({
    nodeId: required(plan.binding.nodes[edit.sourceId]),
    textContent: edit.text,
  }));

  await client.call('set_text_content', {
    fileId: plan.before.fileId,
    updates,
  });
}

export async function patchNodes(
  client: PaperClient,
  plan: SyncPlan,
): Promise<void> {
  for (const parent of plan.master.nodes)
    await moveChildren(client, plan, parent);
  await patchStyles(client, plan);
  await patchText(client, plan);

  if (plan.removes.length)
    await client.call('delete_nodes', {
      fileId: plan.before.fileId,
      nodeIds: plan.removes,
    });
}
