import type { PartUi } from '@repo/contracts/plugins/kit';
import type { WireNode } from '@repo/contracts/plugins/wire';
import {
  childNodeKey,
  slotNodeKey,
} from '@repo/contracts/plugins/wire-node-key';
import { useEffect, useReducer, useState } from 'react';
import { controlProps } from './plugin-control-props';
import type { ControlInput, PluginProps } from './plugin-control-types';
import { NodeControls } from './plugin-node-controls';

export interface PluginControls {
  props: (input: Omit<ControlInput, 'ui'>) => PluginProps;
}

type StoredControl = { type: string; state: NodeControls };

export function usePluginControls(root: WireNode): PluginControls {
  const [controls] = useState(() => new Map<string, StoredControl>());
  const [, update] = useReducer((revision: number) => revision + 1, 0);

  useEffect(() => pruneControls(controls, root), [controls, root]);

  return {
    props: (input) =>
      controlProps(
        { ...input, ui: resolvedUi(input.part.ui) },
        {
          state: nodeState(controls, input),
          update,
        },
      ),
  };
}

function nodeState(
  controls: Map<string, StoredControl>,
  input: Omit<ControlInput, 'ui'>,
): NodeControls {
  const key = input.context.key;
  const existing = controls.get(key);

  if (existing?.type === input.node.type) return existing.state;
  const state = new NodeControls();
  controls.set(key, { state, type: input.node.type });

  return state;
}

function pruneControls(
  controls: Map<string, StoredControl>,
  root: WireNode,
): void {
  const keys = new Set<string>();
  collectKeys(root, childNodeKey('', root.key), keys);

  for (const key of controls.keys()) if (!keys.has(key)) controls.delete(key);
}

function collectKeys(node: WireNode, key: string, keys: Set<string>): void {
  keys.add(key);

  for (const child of node.children)
    collectKeys(child, childNodeKey(key, child.key), keys);
  collectSlotKeys(node, key, keys);
}

function collectSlotKeys(node: WireNode, key: string, keys: Set<string>): void {
  for (const [slot, children] of Object.entries(node.slots)) {
    for (const child of children)
      collectKeys(child, slotNodeKey(key, slot, child.key), keys);
  }
}

function resolvedUi(ui: PartUi = {}): Required<PartUi> {
  return { bindings: [], pending: {}, flush: [], ...ui };
}
