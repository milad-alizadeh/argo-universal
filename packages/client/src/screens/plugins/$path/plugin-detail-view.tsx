import { isRootOnly } from '@repo/contracts/plugins/prepare-tree';
import type { WireNode } from '@repo/contracts/plugins/wire';
import { List } from '@repo/kit/primitives/lists/list';
import { Detail } from '@repo/kit/primitives/scaffolds/detail';
import {
  Screen,
  ScreenDefaultBack,
} from '@repo/kit/primitives/scaffolds/screen';
import { Skeleton } from '@repo/kit/primitives/status/skeleton';
import type * as React from 'react';
import { View } from 'react-native';
import { useKeepSidebarWhilePending } from '#features/frame';
import type { OpenPluginPage } from '../../../lib/product/plugin-actions';
import {
  BoundedPluginTree,
  type OnPageCall,
} from '../../../lib/product/plugin-registry';

// What a page's tree reports back: the page a `navigate` Action opens, and its Page calls.
interface PluginPageCallbacks {
  onOpenPage?: OpenPluginPage;
  // A Loader page's Page state changes and Operation calls (ADR-0050).
  onPageCall?: OnPageCall;
}

export interface PluginDetailViewProps {
  // The page the Plugin draws; null until its first tree arrives.
  root: WireNode | null;
  // What the page draws under its Skeleton until `root` arrives, as this Device last drew it.
  loadingTree?: WireNode | null;
  title?: string;
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
      <PageOrLoadingTree {...props} />
    </ScreenDefaultBack>
  );
}

// A page with no tree yet that this Device drew before loads as it was drawn.
function PageOrLoadingTree(props: PluginDetailViewProps): React.ReactNode {
  const { root, loadingTree: tree } = props;

  if (root || !tree) return <PluginPageBody {...props} />;

  return <LoadingTree tree={tree} title={props.title} />;
}

function PluginPageBody({
  title = 'Plugin',
  ...props
}: PluginDetailViewProps): React.ReactNode {
  if (ownsPage(props.root)) return <PluginContent {...props} />;

  return (
    <Screen title={title}>
      <PageHolder {...props} />
    </Screen>
  );
}

// A List scrolls and insets itself, so it fills the body; anything else scrolls in a Detail.
function PageHolder(props: PluginDetailViewProps): React.ReactNode {
  if (!props.root) return <PendingPage />;

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
    <BoundedPluginTree root={props.root} {...props.callbacks} />
  ) : null;
}

const doesNothing: PluginPageCallbacks = {};

/*
 * The page as this Device last drew it, drawn the way its tree will be, under a Skeleton, so the rows load in the
 * places they will take. It does nothing while it loads.
 */
function LoadingTree({
  tree,
  title,
}: {
  tree: WireNode;
  title?: string;
}): React.ReactElement {
  useKeepSidebarWhilePending();

  return (
    <Skeleton loading fill accessibilityLabel="Loading page">
      <PluginPageBody root={tree} title={title} callbacks={doesNothing} />
    </Skeleton>
  );
}

/*
 * Keep the previous sidebar while the destination waits for its first tree. A page this Device drew before loads
 * in its own rows' places; one it never drew loads as a plain List.
 */
export function PendingPage({
  tree,
}: {
  tree?: WireNode | null;
}): React.ReactElement {
  return tree ? <LoadingTree tree={tree} /> : <PlainPending />;
}

function PlainPending(): React.ReactElement {
  useKeepSidebarWhilePending();

  return (
    <Skeleton loading fill accessibilityLabel="Loading page">
      <List appearance="plain" density="compact" fit />
    </Skeleton>
  );
}
