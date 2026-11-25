import type { WireNode } from '@repo/contracts/plugins/wire';
import {
  wrappingComponent,
  type KitDrawingHit,
} from '@repo/kit/wrapped-component';
import {
  createContext,
  createElement,
  useContext,
  type ElementType,
} from 'react';
import type * as React from 'react';
import { CommentTarget, filling } from './commentable';
import { DraftFade, DraftFrame } from './draft-drawing-nodes';
import type { DraftSeam } from './draft-seam';
import type { PluginProps, RenderContext } from './plugin-rendering';

/*
 * The one way the App wraps a node of a Plugin's tree while a Draft is open (ADR-0057): as a component that stands in
 * for the node's kit component and takes its props, so a parent that reads its children by type (a Table's rows, a
 * List's items) reads the wrapped node as it reads a plain one. Which wrappers a node wears, innermost first: the
 * comment target, the seam's region tag frame, the fade of a node the Agent just drew, and the Agent's drawing frame
 * of a region. A node that wears none draws as its kit component alone, at no cost.
 */
export interface DraftWrapping {
  // The node's address in the tree, which tells two nodes of one key apart.
  address: string;
  // Tells one set of wrappers from another, so a node drawn in other wrappers draws again. Empty when it wears none.
  id: string;
  comment: boolean;
  frame: boolean;
  fade: boolean;
  region: boolean;
}

// What the Agent's drawing says now, which the wrappers read from inside so a frame arming or dissolving redraws no node.
export const DraftDrawingContext = createContext<{
  reduced: boolean;
  framed: ReadonlySet<string>;
}>({ reduced: false, framed: new Set() });

function wrappingId(
  wrapping: Pick<DraftWrapping, 'comment' | 'frame' | 'fade' | 'region'>,
): string {
  return (['comment', 'frame', 'fade', 'region'] as const)
    .filter((layer) => wrapping[layer])
    .join('+');
}

export function draftWrapping(
  node: WireNode,
  { key, draft, seam }: Pick<RenderContext, 'key' | 'draft' | 'seam'>,
): DraftWrapping {
  const layers = {
    comment: seam?.commentable === true,
    frame: seam?.frames(node) === true,
    fade: draft?.faded.has(key) === true,
    // A region is matched by its bare key, so region ids must be unique across the page.
    region: draft?.regions.has(node.key) === true,
  };

  return { ...layers, address: key, id: wrappingId(layers) };
}

type Wrapped = { component: ElementType; id: string; wrapper: ElementType };

/*
 * The wrappers a tree has made, one per node address and set of wrappers, so a node keeps its component, and so its
 * state and what it drew, as long as it wears the same wrappers.
 */
export class DraftWrappers {
  private readonly made = new Map<string, Wrapped>();

  public constructor(private readonly seam: DraftSeam | null) {}

  // The component to draw `node` as: `component` itself when it wears no wrapper.
  public of(
    component: ElementType,
    node: WireNode,
    wrapping: DraftWrapping,
  ): ElementType {
    const { address } = wrapping;

    if (wrapping.id === '' || typeof component === 'string') return component;

    const kept = this.made.get(address);

    if (kept?.component === component && kept.id === wrapping.id)
      return kept.wrapper;

    const wrapper = this.wrapper(component, node, wrapping);

    this.made.set(address, { component, id: wrapping.id, wrapper });

    return wrapper;
  }

  // Only nodes still in the tree keep their wrapper.
  public keep(live: ReadonlySet<string>): void {
    for (const address of this.made.keys())
      if (!live.has(address)) this.made.delete(address);
  }

  private wrapper(
    component: Exclude<ElementType, string>,
    node: WireNode,
    wrapping: DraftWrapping,
  ): ElementType {
    const { key: nodeKey, type } = node;
    const { address } = wrapping;
    const identity = { address, nodeKey };
    const Frame = this.seam?.Frame;

    function wrapDrawing(
      drawing: React.ReactElement,
      hit?: KitDrawingHit,
    ): React.ReactElement {
      let drawn = drawing;

      if (wrapping.comment)
        drawn = (
          <CommentTarget
            identity={identity}
            fills={filling.has(type)}
            hit={hit}
          >
            {drawn}
          </CommentTarget>
        );

      if (wrapping.frame && Frame)
        drawn = createElement(Frame, { nodeKey }, drawn);

      if (wrapping.fade) drawn = <Faded>{drawn}</Faded>;

      if (wrapping.region) drawn = <Region region={nodeKey}>{drawn}</Region>;

      return drawn;
    }

    function DraftNode(props: PluginProps): React.JSX.Element {
      return wrapDrawing(createElement(component, props));
    }

    return wrappingComponent(DraftNode, component, wrapDrawing);
  }
}

function Faded({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { reduced } = useContext(DraftDrawingContext);

  return <DraftFade reduced={reduced}>{children}</DraftFade>;
}

function Region({
  region,
  children,
}: {
  region: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const { reduced, framed } = useContext(DraftDrawingContext);

  return (
    <DraftFrame region={region} active={framed.has(region)} reduced={reduced}>
      {children}
    </DraftFrame>
  );
}
