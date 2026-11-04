import { updateRequiredNode } from '@repo/contracts/plugins/prepare-tree';
import type { WireNode } from '@repo/contracts/plugins/wire';
import type { ReactNode } from 'react';
import { PluginDrawingBoundary } from './plugin-drawing-boundary';
import { PluginTree, type PluginTreeProps } from './plugin-registry';

const drawings = new WeakMap<WireNode, string>();
let counted = 0;

// A tree is one drawing for as long as it is the very same tree, so a newer answer tries again.
function drawingOf(root: WireNode): string {
  const known = drawings.get(root);

  if (known !== undefined) return known;

  counted += 1;

  const next = String(counted);

  drawings.set(root, next);

  return next;
}

/*
 * A Plugin page's or card's tree. The Server checks what it sends and the App checks what a Plugin shows
 * optimistically, but a tree that still throws while it draws must not take the App down: it draws "Update
 * Argo" in its place, and a newer answer is drawn again.
 */
export function BoundedPluginTree(props: PluginTreeProps): ReactNode {
  return (
    <PluginDrawingBoundary
      resetKey={drawingOf(props.root)}
      fallback={<PluginTree root={updateRequiredNode(props.root.key)} />}
    >
      <PluginTree {...props} />
    </PluginDrawingBoundary>
  );
}
