import type { Binding, DesignNode, Snapshot, Styles } from './model.mts';

export type Creation = {
  sourceId: string;
  parentSourceId: string;
  node: DesignNode;
};

export type StyleEdit = { sourceId: string; styles: Styles };

export type Move = { sourceId: string; parentSourceId: string; index: number };

export type SyncPlan = {
  master: Snapshot;
  before: Snapshot;
  binding: Binding;
  creates: Creation[];
  moves: Move[];
  removes: string[];
  styles: StyleEdit[];
  texts: { sourceId: string; text: string }[];
  svgReplacements: string[];
};
