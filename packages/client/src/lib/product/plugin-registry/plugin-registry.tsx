import type { WireNode } from '@repo/contracts/plugins/wire';
import { childNodeKey } from '@repo/contracts/plugins/wire-node-key';
import type * as React from 'react';
import { SvgBudget } from '#primitives/visual';
import { usePluginDispatcher } from '../plugin-dispatcher';
import { RenderNode } from './plugin-nodes';
import type { PluginOnEvent } from './plugin-rendering';
import { usePluginControls } from './use-plugin-controls';

export type { PluginOnEvent } from './plugin-rendering';

export interface PluginTreeProps {
  root: WireNode;
  onEvent: PluginOnEvent;
}

// One tree, one dispatcher: overlays are ordinary nodes in it.
export function PluginTree(props: PluginTreeProps): React.JSX.Element | null {
  const context = {
    key: childNodeKey('', props.root.key),
    send: usePluginDispatcher(props.onEvent),
    controls: usePluginControls(props.root),
  };

  return <SvgBudget>{RenderNode({ node: props.root, context })}</SvgBudget>;
}
