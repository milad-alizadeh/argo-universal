import { isRootOnly } from '@repo/contracts/plugins/prepare-tree';
import type { WireNode, PluginViewId } from '@repo/contracts/plugins/wire';
import { Detail } from '@repo/kit/primitives/scaffolds/detail';
import {
  Screen,
  ScreenDefaultBack,
} from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { View } from 'react-native';
import { useKeepSidebarWhilePending } from '#features/frame';
import type { OpenPluginPage } from '../../../lib/product/plugin-actions';
import {
  PluginTree,
  type PluginOnEvent,
} from '../../../lib/product/plugin-registry';

// What a page's tree reports back: the events its controls send, and the page a `navigate` Action opens.
export interface PluginPageCallbacks {
  onEvent: PluginOnEvent;
  onOpenPage?: OpenPluginPage;
}

export interface PluginDetailViewProps {
  // The page the Plugin draws; blank until the Server's first snapshot arrives.
  root: WireNode | null;
  title?: string;
  viewId?: PluginViewId | null;
  callbacks: PluginPageCallbacks;
  // The App's own Back for a pushed page; a Plugin declares no navigation (`ScreenDefaultBack`).
  onBack?: (() => void) | null;
}

// A Plugin's page, drawn by the App's registry; one that is not a Screen of its own scrolls in the kit's Detail, in the Screen's column.
export function PluginDetailView(
  props: PluginDetailViewProps,
): React.ReactNode {
  return (
    <ScreenDefaultBack value={props.onBack ?? null}>
      <PluginPageBody {...props} />
    </ScreenDefaultBack>
  );
}

function PluginPageBody(props: PluginDetailViewProps): React.ReactNode {
  if (ownsPage(props.root)) return <PluginContent {...props} />;

  return (
    <Screen title={props.title ?? 'Plugin'}>
      <PageHolder {...props} />
    </Screen>
  );
}

// A List scrolls and insets itself, so it fills the body; anything else scrolls in a Detail.
function PageHolder(props: PluginDetailViewProps): React.ReactNode {
  const list = soleList(props.root);

  if (!list)
    return (
      <Detail testID="plugin-page">
        <PluginContent {...props} />
      </Detail>
    );

  return (
    <View testID="plugin-page" className="min-h-0 flex-1">
      <PluginContent {...props} root={list} />
    </View>
  );
}

// The List a page is made of: the root itself, or the one a chain of Stacks holds with nothing beside it. Such a Stack draws what its List would draw alone, so the page drops it and the List fills the body as a root List does.
function soleList(node: WireNode | null): WireNode | null {
  if (node?.type === 'List') return node;

  return soleOf(stackChildren(node));
}

function stackChildren(node: WireNode | null): WireNode[] {
  return node?.type === 'Stack' ? node.children : [];
}

function soleOf(children: WireNode[]): WireNode | null {
  return children.length === 1 ? soleList(children[0] ?? null) : null;
}

// A root-only kit component, Screen or ListDetail, draws its own screen and header.
function ownsPage(root: WireNode | null): boolean {
  return root ? isRootOnly(root) : false;
}

function PluginContent(props: PluginDetailViewProps): React.ReactNode {
  return props.root ? (
    <PluginTree key={props.viewId} root={props.root} {...props.callbacks} />
  ) : (
    <PendingPage />
  );
}

// A page waiting for its first snapshot draws nothing, but holds the sidebar as the page before it left it.
function PendingPage(): null {
  useKeepSidebarWhilePending();

  return null;
}
