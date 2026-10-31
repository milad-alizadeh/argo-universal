import { isRootOnly } from '@repo/contracts/plugins/prepare-tree';
import type { WireNode, PluginViewId } from '@repo/contracts/plugins/wire';
import { Detail } from '@repo/kit/primitives/scaffolds/detail';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
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
}

// A Plugin's page, drawn by the App's registry; one that is not a Screen of its own scrolls in the kit's Detail, in the Screen's column.
export function PluginDetailView(
  props: PluginDetailViewProps,
): React.ReactNode {
  if (ownsPage(props.root)) return <PluginContent {...props} />;

  return (
    <Screen title={props.title ?? 'Plugin'}>
      <PageHolder root={props.root}>
        <PluginContent {...props} />
      </PageHolder>
    </Screen>
  );
}

// A List scrolls and insets itself, so a page that is one fills the body; anything else scrolls in a Detail.
function PageHolder(props: {
  root: WireNode | null;
  children: React.ReactNode;
}): React.ReactNode {
  if (!isListPage(props.root))
    return <Detail testID="plugin-page">{props.children}</Detail>;

  return (
    <View testID="plugin-page" className="min-h-0 flex-1">
      {props.children}
    </View>
  );
}

// A List alone on the page, bare or inside Stacks that hold nothing else, which add no inset of their own.
function isListPage(node: WireNode | null | undefined): boolean {
  return node?.type === 'List' || isLone(stackChildren(node));
}

function stackChildren(node: WireNode | null | undefined): WireNode[] {
  return node?.type === 'Stack' ? node.children : [];
}

function isLone(children: WireNode[]): boolean {
  return children.length === 1 && isListPage(children[0]);
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
