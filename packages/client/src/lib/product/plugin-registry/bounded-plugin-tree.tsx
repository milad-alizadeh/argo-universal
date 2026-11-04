import { updateRequiredNode } from '@repo/contracts/plugins/prepare-tree';
import type { ReactNode } from 'react';
import { drawingOf, PluginDrawingBoundary } from './plugin-drawing-boundary';
import { PluginTree, type PluginTreeProps } from './plugin-registry';

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
