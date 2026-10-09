import { z } from 'zod';
import type { PaperPort } from './paper-port.mts';
import type { Styles } from './snapshot-model.mts';

// Typed writes the sync uses; only `paper:sync --apply` calls these.
const duplicateSchema = z.object({
  duplicatedNodes: z.array(
    z.object({
      newId: z.string(),
      descendantIdMap: z.record(z.string(), z.string()),
    }),
  ),
});
const imageSchema = z.object({ type: z.literal('image'), data: z.string() });

export interface Clone {
  id: string;
  // Each master descendant id → its clone.
  map: Record<string, string>;
}

export async function duplicateInto(
  paper: PaperPort,
  id: string,
  parentId: string,
): Promise<Clone> {
  const payload = await paper.call('duplicate_nodes', {
    nodes: [{ id, parentId }],
  });
  const [clone] = duplicateSchema.parse(payload).duplicatedNodes;
  if (!clone) throw new Error(`Paper did not duplicate ${id}.`);
  return { id: clone.newId, map: clone.descendantIdMap };
}

export async function moveBefore(
  paper: PaperPort,
  nodeId: string,
  before: string,
): Promise<void> {
  await paper.call('move_nodes', { moves: [{ nodeId, before }] });
}

export async function updateStyles(
  paper: PaperPort,
  updates: { nodeIds: string[]; styles: Styles }[],
): Promise<void> {
  if (updates.length > 0) await paper.call('update_styles', { updates });
}

export async function setTexts(
  paper: PaperPort,
  updates: { nodeId: string; textContent: string }[],
): Promise<void> {
  if (updates.length > 0) await paper.call('set_text_content', { updates });
}

export async function deleteNodes(
  paper: PaperPort,
  nodeIds: string[],
): Promise<void> {
  if (nodeIds.length > 0) await paper.call('delete_nodes', { nodeIds });
}

export async function finishWorking(paper: PaperPort): Promise<void> {
  await paper.call('finish_working_on_nodes', {});
}

export async function screenshot(
  paper: PaperPort,
  nodeId: string,
): Promise<Uint8Array> {
  const image = imageSchema.parse(
    await paper.call('get_screenshot', { nodeId }),
  );
  return Buffer.from(image.data, 'base64');
}

const RENAME_BATCH = 200;

export async function renameNodes(
  paper: PaperPort,
  updates: { nodeId: string; name: string }[],
): Promise<void> {
  for (let start = 0; start < updates.length; start += RENAME_BATCH)
    await paper.call('rename_nodes', {
      updates: updates.slice(start, start + RENAME_BATCH),
    });
}
