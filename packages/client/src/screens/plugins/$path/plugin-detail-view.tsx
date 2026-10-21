import { isRootOnly } from '@repo/contracts/plugins/prepare-tree';
import type { WireNode, PluginViewId } from '@repo/contracts/plugins/wire';
import { Page } from '@repo/kit/primitives/scaffolds/page';
import type * as React from 'react';
import { ScrollFadeView } from '#lib/product/scroll-fade/scroll-fade';
import {
  PluginTree,
  type PluginOnEvent,
} from '../../../lib/product/plugin-registry';

export interface PluginDetailViewProps {
  // The page the Plugin draws; blank until the Server's first snapshot arrives.
  root: WireNode | null;
  title?: string;
  viewId?: PluginViewId | null;
  onEvent: PluginOnEvent;
}

// Under iOS 26's transparent header, the page starts below it and scrolls on under the glass.
const pageScroll = {
  testID: 'plugin-page',
  className: 'bg-content',
  surfaceClassName: 'bg-content',
  contentContainerClassName: 'px-6 py-6 wide:px-0',
  contentInsetAdjustmentBehavior: 'automatic',
} as const;

// Foundations / PluginPage: a Plugin's page, drawn by the App's registry.
export function PluginDetailView(
  props: PluginDetailViewProps,
): React.ReactNode {
  if (ownsPage(props.root)) return <PluginContent {...props} />;

  return (
    <Page title={props.title ?? 'Plugin'}>
      <ScrollFadeView {...pageScroll}>
        <PluginContent {...props} />
      </ScrollFadeView>
    </Page>
  );
}

// A root-only part, Page or ListDetail, draws its own screen and header.
function ownsPage(root: WireNode | null): boolean {
  return root ? isRootOnly(root) : false;
}

function PluginContent(props: PluginDetailViewProps): React.ReactNode {
  return props.root ? (
    <PluginTree key={props.viewId} root={props.root} onEvent={props.onEvent} />
  ) : null;
}
