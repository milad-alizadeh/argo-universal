import type { WireNode } from '@repo/contracts/plugins/wire';
import type * as React from 'react';
import { View } from 'react-native';
import { PluginTree } from '../../../lib/product/plugin-registry';
import { ScrollFadeView } from '../../../lib/product/scroll-fade/scroll-fade';

export interface PluginDetailViewProps {
  // The page the Plugin draws; blank until the Server's first snapshot arrives.
  root: WireNode | null;
  onEvent: (eventId: string) => void;
}

const scrollProps = {
  surfaceClassName: 'bg-content',
  contentInsetAdjustmentBehavior: 'automatic',
  contentContainerClassName: 'p-6',
} as const;

// Foundations / PluginPage: a Plugin's page, drawn by the App's registry. It scrolls, and starts below a header that floats over the page.
export function PluginDetailView({
  root,
  onEvent,
}: PluginDetailViewProps): React.JSX.Element {
  return (
    <View testID="plugin-page" className="flex-1 bg-content">
      <ScrollFadeView {...scrollProps}>
        {root && <PluginTree root={root} onEvent={onEvent} />}
      </ScrollFadeView>
    </View>
  );
}
