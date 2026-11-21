import type { WireNode } from '@repo/contracts/plugins/wire';
import { createContext, type ComponentType, type ReactElement } from 'react';

/*
 * The one dev-only seam through which the App marks up a Plugin's tree while a Draft is open (ADR-0057). A node
 * it frames draws inside the App's own frame, which reads what it shows from the App; the tree on the wire is
 * never changed. Left unset, as for every shipped Plugin, a node draws as its kit element alone.
 */
export interface DraftSeam {
  frames: (node: WireNode) => boolean;
  Frame: ComponentType<{ node: WireNode; children?: ReactElement }>;
}

// Whether the region a node draws in wears the Agent's drawing frame now, which the App's frame reads from inside it.
export const DraftFramedContext = createContext(false);

export const DraftSeamContext = createContext<DraftSeam | null>(null);
