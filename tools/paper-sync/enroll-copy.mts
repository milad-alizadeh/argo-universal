import { enroll } from './bind.mts';
import { location, nodeMap } from './catalog.mts';
import type { EnrollmentContext } from './enrollment-model.mts';
import type { LocatedNode } from './index-model.mts';
import type { Binding, Snapshot } from './model.mts';
import { structure } from './rebind.mts';

function oldBinding(
  context: EnrollmentContext,
  node: LocatedNode,
): Binding | undefined {
  return context.previous.families
    .find((family) => family.name === node.name)
    ?.copies.find(
      (copy) => copy.fileId === node.fileId && copy.nodeId === node.id,
    );
}

async function readBinding(
  context: EnrollmentContext,
  source: Snapshot,
  node: LocatedNode,
): Promise<Binding> {
  const copy = await context.reader.read(node.fileId, node.id);
  const binding = oldBinding(context, node) ?? enroll(source, copy);

  return {
    ...binding,
    structure: structure(copy),
    location: location(node, nodeMap(context.catalog.nodes)),
  };
}

export async function enrollCopy(
  context: EnrollmentContext,
  source: Snapshot,
  node: LocatedNode,
): Promise<Binding | undefined> {
  try {
    return await readBinding(context, source, node);
  } catch (error) {
    const { fileId, id: nodeId, name } = node;
    const identity = { fileId, nodeId, name };
    context.result.excluded.push({ ...identity, reason: String(error) });

    return undefined;
  }
}
