import type { WireNode } from '@repo/contracts/plugins/wire';
import type * as React from 'react';
import { ScrollFadeView } from '#lib/product/scroll-fade/scroll-fade';
import { ActionShortcutScope } from '#primitives/actions/action-list';
import {
  PluginTree,
  type PluginOnEvent,
} from '../../../lib/product/plugin-registry';

export interface PluginDetailViewProps {
  // The page the Plugin draws; blank until the Server's first snapshot arrives.
  root: WireNode | null;
  onEvent: PluginOnEvent;
}

// Under iOS 26's transparent header, the page starts below it and scrolls on under the glass.
const pageScroll = {
  testID: 'plugin-page',
  className: 'bg-content',
  surfaceClassName: 'bg-content',
  contentContainerClassName: 'p-6',
  contentInsetAdjustmentBehavior: 'automatic',
} as const;

// Foundations / PluginPage: a Plugin's page, drawn by the App's registry.
export function PluginDetailView({
  root,
  onEvent,
}: PluginDetailViewProps): React.JSX.Element {
  return (
    <ActionShortcutScope>
      <ScrollFadeView {...pageScroll}>
        {root && <PluginTree root={root} onEvent={onEvent} />}
      </ScrollFadeView>
    </ActionShortcutScope>
  );
}
