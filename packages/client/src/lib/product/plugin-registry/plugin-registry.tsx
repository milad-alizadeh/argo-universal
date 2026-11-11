import type { WireNode } from '@repo/contracts/plugins/wire';
import { childNodeKey } from '@repo/contracts/plugins/wire-node-key';
import { PluginTreeContext } from '@repo/kit/plugin-tree-context';
import { SvgBudget } from '@repo/kit/primitives/visual';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type * as React from 'react';
import { pageUnavailable, type OpenPluginPage } from '../plugin-actions';
import { pageCallRefused } from './component-event-props';
import { DrawnNodes } from './drawn-nodes';
import { RenderNode } from './plugin-nodes';
import type { OnPageCall } from './plugin-rendering';
import { useComponentEvents } from './use-component-events';

export type { OnPageCall } from './plugin-rendering';

export interface PluginTreeProps {
  root: WireNode;
  // Opens the page a `navigate` Action names, for the Plugin that drew this tree; a tree with no Plugin behind it has none.
  onOpenPage?: OpenPluginPage;
  // A Loader page's Page state changes and Operation calls.
  onPageCall?: OnPageCall;
}

/*
 * One function for the tree's life that calls `latest` as its caller passes it now, or `fallback` while it passes none,
 * so a node kept from an earlier draw still reaches the caller's newest, even one added or removed since.
 */
function useLatest<Args extends unknown[], Result>(
  latest: ((...args: Args) => Result) | undefined,
  fallback: (...args: Args) => Result,
): (...args: Args) => Result {
  const ref = useRef(latest);
  useLayoutEffect(() => {
    ref.current = latest;
  });

  return useCallback(
    (...args: Args) => (ref.current ?? fallback)(...args),
    [fallback],
  );
}

// One tree: overlays are ordinary nodes in it.
export function PluginTree(props: PluginTreeProps): React.JSX.Element | null {
  const [drawn] = useState(() => new DrawnNodes());

  const context = {
    key: childNodeKey('', props.root.key),
    openPage: useLatest(props.onOpenPage, pageUnavailable),
    controls: useComponentEvents(props.root, drawn),
    pageCall: useLatest(props.onPageCall, pageCallRefused),
    drawn,
  };

  return (
    <PluginTreeContext value>
      <SvgBudget>{RenderNode({ node: props.root, context })}</SvgBudget>
    </PluginTreeContext>
  );
}
