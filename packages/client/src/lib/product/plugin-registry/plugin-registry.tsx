import { isWireContainer } from '@repo/contracts/plugins/prepare-tree';
import type { WireNode } from '@repo/contracts/plugins/wire';
import {
  childNodeKey,
  slotNodeKey,
} from '@repo/contracts/plugins/wire-node-key';
import type * as React from 'react';
import {
  Fragment,
  cloneElement,
  createElement,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { pluginEntries } from './plugin-entries';
import { PluginOverlay } from './plugin-overlay';
import { overlayEvents } from './plugin-overlay-events';
import type { RenderContext, PluginOnEvent } from './plugin-rendering';
import { Unsupported } from './plugin-unsupported';
import type { OpenOverlay } from './use-plugin-actions';
import { usePluginActions, type PluginActions } from './use-plugin-actions';
import { usePluginUi } from './use-plugin-ui';

export type { PluginOnEvent } from './plugin-rendering';

export interface PluginTreeProps {
  root: WireNode;
  onEvent: PluginOnEvent;
  actions?: PluginActions;
}

const registry = new Map(Object.entries(pluginEntries));

interface RenderNodeProps {
  node: WireNode;
  context: RenderContext;
}

function RenderNode({
  node,
  context,
}: RenderNodeProps): React.JSX.Element | null {
  const known = registry.get(node.type);

  if (!known) return isWireContainer(node) ? <Unsupported /> : null;
  const children = renderedChildren(node, context);
  const filled = { ...context, slots: renderedSlots(node, context) };

  return known.render(node, filled, children);
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
    onEvent: ui.send,
    dispatch: useCurrentDispatch(props.onEvent),
    key: childNodeKey('', props.root.key),
    ui,
    actions,
    slots: {},
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

function renderedChildren(
  node: WireNode,
  context: RenderContext,
): React.ReactNode {
  return node.children.map((child) => {
    const rendered = RenderNode({
      node: child,
      context: { ...context, key: childNodeKey(context.key, child.key) },
    });

    return rendered ? cloneElement(rendered, { key: child.key }) : null;
  });
}

function renderedSlots(
  node: WireNode,
  context: RenderContext,
): Record<string, React.JSX.Element> {
  return Object.fromEntries(
    Object.entries(node.slots).map(([name, children]) => [
      name,
      <Fragment key={name}>
        {children.map((child) => slotNode(context, name, child))}
      </Fragment>,
    ]),
  );
}

function slotNode(
  context: RenderContext,
  name: string,
  child: WireNode,
): React.JSX.Element {
  return (
    <RenderNode
      key={child.key}
      node={child}
      context={{ ...context, key: slotNodeKey(context.key, name, child.key) }}
    />
  );
}
