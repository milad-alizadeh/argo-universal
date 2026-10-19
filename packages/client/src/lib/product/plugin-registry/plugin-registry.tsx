import type { WireNode } from '@repo/contracts/plugins/wire';
import { childNodeKey } from '@repo/contracts/plugins/wire-node-key';
import * as React from 'react';
import { usePluginActions, type PluginActions } from '../plugin-actions';
import { usePluginDispatcher } from '../plugin-dispatcher';
import { RenderNode } from './plugin-nodes';
import type { RenderContext, PluginOnEvent } from './plugin-rendering';
import { usePluginControls } from './use-plugin-controls';

export type { PluginOnEvent } from './plugin-rendering';

export interface PluginTreeProps {
  root: WireNode;
  onEvent: PluginOnEvent;
  actions?: PluginActions;
}

export function PluginTree(props: PluginTreeProps): React.JSX.Element {
  const [actions, overlay] = usePluginActions(props.actions, PluginTree);
  const context = useRenderContext(props, actions);
  const content = RenderNode({ node: props.root, context });

  return React.createElement(React.Fragment, null, content, overlay);
}

function useRenderContext(
  props: PluginTreeProps,
  actions: PluginActions,
): RenderContext {
  const ui = usePluginDispatcher(props.onEvent);
  React.useEffect(() => actions.registerFlush(ui.flush), [actions, ui.flush]);

  return {
    key: childNodeKey('', props.root.key),
    ui,
    actions,
    controls: usePluginControls(props.root),
  };
}
