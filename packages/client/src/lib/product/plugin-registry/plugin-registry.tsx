import type { WireNode } from '@repo/contracts/plugins/wire';
import { childNodeKey } from '@repo/contracts/plugins/wire-node-key';
import { PluginTreeContext } from '@repo/kit/plugin-tree-context';
import { SvgBudget } from '@repo/kit/primitives/visual';
import type * as React from 'react';
import { pageUnavailable, type OpenPluginPage } from '../plugin-actions';
import { RenderNode } from './plugin-nodes';
import type { PluginOnEvent } from './plugin-rendering';
import { useComponentEvents } from './use-component-events';

export type { PluginOnEvent } from './plugin-rendering';

export interface PluginTreeProps {
  root: WireNode;
  onEvent: PluginOnEvent;
  // Opens the page a `navigate` Action names, for the Plugin that drew this tree; a tree with no Plugin behind it has none.
  onOpenPage?: OpenPluginPage;
}

// One tree, one dispatcher: overlays are ordinary nodes in it.
export function PluginTree(props: PluginTreeProps): React.JSX.Element | null {
  const context = {
    key: childNodeKey('', props.root.key),
    openPage: props.onOpenPage ?? pageUnavailable,
    controls: useComponentEvents(props.root, props.onEvent),
  };

  return (
    <PluginTreeContext value>
      <SvgBudget>{RenderNode({ node: props.root, context })}</SvgBudget>
    </PluginTreeContext>
  );
}
