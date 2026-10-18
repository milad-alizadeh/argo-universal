import type { WireNode } from '@repo/contracts/plugins/wire';
import { childNodeKey } from '@repo/contracts/plugins/wire-node-key';
import * as React from 'react';
import { usePluginDispatcher } from '../plugin-dispatcher';
import { RenderNode } from './plugin-nodes';
import { PluginOverlay } from './plugin-overlay';
import { overlayEvents } from './plugin-overlay-events';
import type { RenderContext, PluginOnEvent } from './plugin-rendering';
import type { OpenOverlay } from './use-plugin-actions';
import { usePluginActions, type PluginActions } from './use-plugin-actions';
import { usePluginControls } from './use-plugin-controls';

export type { PluginOnEvent } from './plugin-rendering';

export interface PluginTreeProps {
  root: WireNode;
  onEvent: PluginOnEvent;
  actions?: PluginActions;
}

export function PluginTree(props: PluginTreeProps): React.JSX.Element {
  const actions = usePluginActions(props.actions);
  const context = useRenderContext(props, actions);
  const content = RenderNode({ node: props.root, context });

  const overlay = props.actions ? null : (
    <PluginOverlay actions={actions} renderContent={overlayRenderer(actions)} />
  );

  return React.createElement(React.Fragment, null, content, overlay);
}

function overlayRenderer(
  actions: PluginActions,
): (opened: OpenOverlay) => React.JSX.Element {
  return (opened) => (
    <PluginTree
      key={opened.id}
      root={opened.action.content}
      onEvent={overlayEvents(opened)}
      actions={actions}
    />
  );
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
