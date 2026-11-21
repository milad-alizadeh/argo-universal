import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';
import type { DraftRegionTag } from '../../utils/draft-regions-model';

// Header's second Variant of three, the example the design shows.
export const headerTag: DraftRegionTag = {
  id: 'header',
  label: 'Header',
  variant: 'tabs',
  letter: 'B',
  position: 2,
  count: 3,
};

// List's first Variant of two.
export const listTag: DraftRegionTag = {
  id: 'list',
  label: 'List',
  variant: 'rows',
  letter: 'A',
  position: 1,
  count: 2,
};

// Stands in for a region's own drawing.
export function HeaderDrawing(): React.JSX.Element {
  return (
    <View className="gap-0.5 rounded-xl border border-hairline bg-card p-3">
      <Text role="title">Issues</Text>
      <Text role="secondary">ARGO · 24 open</Text>
    </View>
  );
}

export function ListDrawing(): React.JSX.Element {
  return (
    <View className="rounded-xl border border-hairline bg-card p-3">
      <Text role="body">Workbench card loses its tab after a reload</Text>
      <Text role="secondary">ARGO-412 · In progress</Text>
    </View>
  );
}
