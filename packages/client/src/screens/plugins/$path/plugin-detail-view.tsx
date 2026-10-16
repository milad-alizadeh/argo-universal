import type { WireNode } from '@repo/contracts/plugins/wire';
import type * as React from 'react';
import { View } from 'react-native';
import { PluginTree } from '../../../lib/generic/plugin-registry';

export interface PluginDetailViewProps {
  // The page the Plugin draws; blank until the Server's first snapshot arrives.
  root: WireNode | null;
  onEvent: (eventId: string) => void;
}

// Foundations / PluginPage: a Plugin's page, drawn by the App's registry.
export function PluginDetailView({
  root,
  onEvent,
}: PluginDetailViewProps): React.JSX.Element {
  return (
    <View testID="plugin-page" className="flex-1 bg-content p-6">
      {root && <PluginTree root={root} onEvent={onEvent} />}
    </View>
  );
}
