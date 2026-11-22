import { createContext, type ComponentType } from 'react';

export type NodeIdentity = {
  // The node's address in the tree, which tells two nodes of one key apart.
  address: string;
  nodeKey: string;
};

export type DraftPlace = {
  region: string;
  variant: string;
  label: string;
  letter: string;
};

// `radius` is the node's own corner radius where the window can read it, so what is drawn over the node follows its corners.
export type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
};

export const boxOf = ([x, y, width, height]: readonly [
  number,
  number,
  number,
  number,
]): Box => ({ x, y, width, height });

export interface CommentTarget extends NodeIdentity {
  place: DraftPlace | null;
  measure: (done: (box: Box) => void) => void;
  // The first line of text the node shows, where the window can read it; empty where it cannot.
  text: () => string;
}

/*
 * The dev-only seam through which the App lets an author pick any node of a Plugin's tree to comment on while a
 * Draft is open (ADR-0057). A picked node draws exactly as before, with what the App draws over it; the tree on the
 * wire is never changed. Left unset, as for every shipped Plugin, a node draws as its kit element alone.
 */
export interface DraftCommenting {
  register: (target: CommentTarget) => () => void;
  Mark: ComponentType<{
    address: string;
    place: DraftPlace | null;
    measure: (done: (box: Box) => void) => void;
  }>;
}

export const DraftCommentingContext = createContext<DraftCommenting | null>(
  null,
);

export const DraftPlaceContext = createContext<DraftPlace | null>(null);
