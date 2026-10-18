import type { WireNode, PluginViewId } from '@repo/contracts/plugins/wire';
import type * as React from 'react';
import { ScrollFadeView } from '#lib/product/scroll-fade/scroll-fade';
import { Page } from '#primitives/scaffolds/page';
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
  contentContainerClassName: 'py-6',
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

function ownsPage(root: WireNode | null): boolean {
  return root?.type === 'Page';
}

function PluginContent(props: PluginDetailViewProps): React.ReactNode {
  return props.root ? (
    <PluginTree key={props.viewId} root={props.root} onEvent={props.onEvent} />
  ) : null;
}
