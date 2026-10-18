import type { WireNode } from '@repo/contracts/plugins/wire';
import { childNodeKey } from '@repo/contracts/plugins/wire-node-key';
import type * as React from 'react';
import { Fragment, createElement, useRef, useEffect, useCallback } from 'react';
import { RenderNode } from './plugin-nodes';
import { PluginOverlay } from './plugin-overlay';
import { overlayEvents } from './plugin-overlay-events';
import type { RenderContext, PluginOnEvent } from './plugin-rendering';
import type { OpenOverlay } from './use-plugin-actions';
import { usePluginActions, type PluginActions } from './use-plugin-actions';
import { usePluginControls } from './use-plugin-controls';
import { usePluginUi } from './use-plugin-ui';

export type { PluginOnEvent } from './plugin-rendering';

export interface PluginTreeProps {
  root: WireNode;
  onEvent: PluginOnEvent;
  actions?: PluginActions;
}

export function PluginTree({
  actions: inherited,
  ...props
}: PluginTreeProps): React.JSX.Element {
  const local = usePluginActions();
  const actions = inherited ?? local;
  const context = useRenderContext(props, actions);

  const content = <RenderNode node={props.root} context={context} />;

  const overlay = inherited ? null : (
    <PluginOverlay actions={actions} renderContent={overlayRenderer(actions)} />
  );

  return createElement(Fragment, null, content, overlay);
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
  const ui = usePluginUi(props.onEvent);
  useActionFlush(actions.registerFlush, ui.flush);

  return {
    dispatch: useCurrentDispatch(props.onEvent),
    key: childNodeKey('', props.root.key),
    ui,
    actions,
    controls: usePluginControls(props.root),
  };
}

function useActionFlush(
  register: PluginActions['registerFlush'],
  flush: () => Promise<void>,
): void {
  useEffect(() => register(flush), [register, flush]);
}

function useCurrentDispatch(onEvent: PluginOnEvent): PluginOnEvent {
  const current = useRef(onEvent);
  useEffect(() => {
    current.current = onEvent;
  }, [onEvent]);

  return useCallback(
    (key, interaction) => current.current(key, interaction),
    [],
  );
}
