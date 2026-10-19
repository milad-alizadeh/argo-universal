import { z } from 'zod';
import type { PaperClient } from './client.mts';
import { type Binding, type DesignNode } from './model.mts';
import { type SyncPlan, hasChanges, planSync, sameSnapshot } from './plan.mts';
import { readSnapshot } from './read.mts';
import { escapeHtml, cssName } from './svg.mts';

const childrenSchema = z.object({
  children: z.array(z.object({ id: z.string() })),
});

function htmlFor(node: DesignNode): string {
  if (node.svg)
    return node.svg.replace(
      '<svg ',
      `<svg layer-name="${escapeHtml(node.name)}" `,
    );
  if (!['Frame', 'Text'].includes(node.component))
    throw new Error(`Unsupported node type ${node.component}`);
  const styles = Object.entries(node.styles)
    .map(([key, value]) => `${cssName(key)}:${value}`)
    .join(';');
  return `<div layer-name="${escapeHtml(node.name)}" style="${escapeHtml(styles)}"${node.isVisible ? '' : ' hidden'}>${escapeHtml(node.textContent ?? '')}</div>`;
}

async function insertNode(
  client: PaperClient,
  plan: SyncPlan,
  node: DesignNode,
): Promise<string> {
  const parentId = plan.binding.nodes[node.parentId!];
  if (!parentId) throw new Error(`No destination parent for ${node.name}`);
  const args = { fileId: plan.before.fileId, nodeId: parentId };
  const before = await client.read('get_children', args, childrenSchema);
  await client.call('write_html', {
    fileId: plan.before.fileId,
    targetNodeId: parentId,
    mode: 'insert-children',
    html: htmlFor(node),
  });
  const after = await client.read('get_children', args, childrenSchema);
  const added = after.children.filter(
    (child) => !before.children.some((old) => old.id === child.id),
  );
  if (added.length !== 1)
    throw new Error(
      `Expected one inserted ${node.name}, received ${added.length}`,
    );
  return added[0]!.id;
}

async function createNodes(client: PaperClient, plan: SyncPlan): Promise<void> {
  for (const creation of plan.creates) {
    const id = await insertNode(client, plan, creation.node);
    plan.binding.nodes[creation.sourceId] = id;
  }
  for (const sourceId of plan.svgReplacements) {
    const source = plan.master.nodes.find((node) => node.id === sourceId)!;
    const previous = plan.binding.nodes[sourceId]!;
    plan.binding.nodes[sourceId] = await insertNode(client, plan, source);
    plan.removes.push(previous);
  }
}

async function moveChildren(
  client: PaperClient,
  plan: SyncPlan,
): Promise<void> {
  for (const parent of plan.master.nodes) {
    if (!parent.childIds.length) continue;
    const moves = parent.childIds.map((sourceId, index) => ({
      nodeId: plan.binding.nodes[sourceId]!,
      parentId: plan.binding.nodes[parent.id]!,
      index,
    }));
    await client.call('move_nodes', { fileId: plan.before.fileId, moves });
  }
}

async function patchNodes(client: PaperClient, plan: SyncPlan): Promise<void> {
  const updates = plan.styles
    .filter((edit) => !plan.svgReplacements.includes(edit.sourceId))
    .map((edit) => ({
      nodeIds: [plan.binding.nodes[edit.sourceId]!],
      styles: edit.styles,
    }));
  for (const clearing of [true, false]) {
    const batch = updates
      .map((update) => ({
        ...update,
        styles: Object.fromEntries(
          Object.entries(update.styles).filter(
            ([, value]) => (value === '') === clearing,
          ),
        ),
      }))
      .filter((update) => Object.keys(update.styles).length);
    if (batch.length)
      await client.call('update_styles', {
        fileId: plan.before.fileId,
        updates: batch,
      });
  }
  if (plan.texts.length)
    await client.call('set_text_content', {
      fileId: plan.before.fileId,
      updates: plan.texts.map((edit) => ({
        nodeId: plan.binding.nodes[edit.sourceId]!,
        textContent: edit.text,
      })),
    });
}

export async function applyPlan(
  client: PaperClient,
  original: SyncPlan,
): Promise<Binding> {
  const current = await readSnapshot(
    client,
    original.before.fileId,
    original.before.rootId,
  );
  if (!sameSnapshot(current, original.before))
    throw new Error(
      `${original.binding.name}: copy changed after the plan; run again`,
    );
  const plan = structuredClone(original);
  await createNodes(client, plan);
  await moveChildren(client, plan);
  await patchNodes(client, plan);
  if (plan.removes.length)
    await client.call('delete_nodes', {
      fileId: plan.before.fileId,
      nodeIds: plan.removes,
    });
  const after = await readSnapshot(
    client,
    plan.before.fileId,
    plan.before.rootId,
  );
  const remaining = planSync(plan.master, after, plan.binding);
  if (hasChanges(remaining))
    throw new Error(
      `${plan.binding.name}: verification found remaining differences: ${JSON.stringify(summarize(remaining))}`,
    );
  return remaining.binding;
}

export function summarize(plan: SyncPlan): object {
  return {
    name: plan.binding.name,
    fileId: plan.before.fileId,
    nodeId: plan.before.rootId,
    additions: plan.creates.length,
    removals: plan.removes.length,
    moves: plan.moves.length,
    styles: plan.styles.length,
    texts: plan.texts.length,
    svg: plan.svgReplacements.length,
    preservedLabel: plan.binding.textOverrides.label ?? null,
  };
}
