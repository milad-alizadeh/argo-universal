import { createContext, type ComponentType } from 'react';

// Where a node sits in the tree and how the Plugin named it, which a comment on it carries.
export type NodeIdentity = {
  // The node's address in the tree, which tells two nodes of one key apart.
  address: string;
  // The key the Plugin gave the node.
  nodeKey: string;
};

// The region of a Draft page a node sits in and the Variant it shows, when it sits in one.
export type DraftPlace = {
  region: string;
  variant: string;
  // What the region's tag calls them, which the editor names the node by.
  label: string;
  letter: string;
};

// A node the author can pick: where it is on screen now, measured when asked.
export interface CommentTarget extends NodeIdentity {
  place: DraftPlace | null;
  measure: (
    done: (x: number, y: number, width: number, height: number) => void,
  ) => void;
}

/*
 * The dev-only seam through which the App lets an author pick any node of a Plugin's tree to comment on while a
 * Draft is open (ADR-0057). A picked node draws exactly as before, with what the App draws over it; the tree on the
 * wire is never changed. Left unset, as for every shipped Plugin, a node draws as its kit element alone.
 */
export interface DraftCommenting {
  // Makes a node pickable while it is drawn; the answer takes it back.
  register: (target: CommentTarget) => () => void;
  // What the App draws over a node: its pin and, while picked, its outline.
  Mark: ComponentType<{ address: string }>;
}

export const DraftCommentingContext = createContext<DraftCommenting | null>(
  null,
);

// The region of a Draft page a node draws in, as the App's region frame says.
export const DraftPlaceContext = createContext<DraftPlace | null>(null);
