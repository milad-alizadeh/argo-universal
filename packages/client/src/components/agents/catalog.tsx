import { LegendList } from '@legendapp/list/react-native';
import type { AgentsCatalogOutput } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import { CatalogRow } from './catalog-row';

type CatalogProps = { catalog: AgentsCatalogOutput };

export function AgentCatalog({ catalog }: CatalogProps): React.JSX.Element {
  return (
    <View className="flex-1 min-h-0">
      <CatalogStatus catalog={catalog} />
      <CatalogEntries catalog={catalog} />
    </View>
  );
}

function CatalogEntries({ catalog }: CatalogProps): React.JSX.Element {
  return (
    <LegendList
      role="list"
      data={catalog.agents}
      style={{ flex: 1 }}
      estimatedItemSize={120}
      recycleItems={false}
      keyExtractor={({ entry }): string => entry.id}
      renderItem={({ item }): React.JSX.Element => <CatalogRow agent={item} />}
      ListEmptyComponent={<CatalogEmpty catalog={catalog} />}
    />
  );
}

function CatalogEmpty({ catalog }: CatalogProps): React.JSX.Element {
  return (
    <Text className="px-gutter py-6 text-muted-foreground">
      {catalog.status === 'unavailable'
        ? 'No cached catalog is available.'
        : 'No Agents found.'}
    </Text>
  );
}

function CatalogStatus({ catalog }: CatalogProps): React.JSX.Element {
  return (
    <View className="gap-1 px-gutter pb-4">
      <Text variant="muted">Server platform: {catalog.serverPlatform}</Text>
      <CatalogNotice catalog={catalog} />
    </View>
  );
}

function CatalogNotice({ catalog }: CatalogProps): React.JSX.Element | null {
  if (catalog.status === 'fresh') return null;
  return (
    <View role="alert" className="gap-1">
      <Text>
        {catalog.status === 'stale'
          ? 'Showing the last good catalog. Refresh is unavailable.'
          : 'The catalog is unavailable.'}
      </Text>
      <Text className="text-destructive text-sm">{catalog.error}</Text>
    </View>
  );
}
