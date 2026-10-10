import { LegendList } from '@legendapp/list/react-native';
import type { AgentsCatalogOutput } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { Button } from '#lib/generic/primitives/button';
import { Text } from '#lib/generic/primitives/text';
import { Icon } from '../../../lib/generic/symbols/icon';
import { CatalogRow } from './catalog-row';

export type CatalogRefreshProps = {
  refreshing: boolean;
  onRefresh: () => void;
};
type CatalogProps = CatalogRefreshProps & {
  catalog: AgentsCatalogOutput;
  search: string;
};
type CatalogStatusProps = Pick<CatalogProps, 'catalog'>;

export function AgentCatalog(props: CatalogProps): React.JSX.Element {
  return (
    <View className="flex-1 min-h-0">
      <CatalogStatus catalog={props.catalog} />
      <CatalogEntries {...props} />
    </View>
  );
}

function CatalogEntries(props: CatalogProps): React.JSX.Element {
  return (
    <LegendList
      role="list"
      data={props.catalog.agents}
      style={{ flex: 1 }}
      estimatedItemSize={120}
      recycleItems={false}
      keyExtractor={({ id }): string => id}
      renderItem={({ item }): React.JSX.Element => <CatalogRow agent={item} />}
      ListEmptyComponent={<CatalogEmpty {...props} />}
    />
  );
}

function CatalogEmpty(props: CatalogProps): React.JSX.Element {
  if (props.catalog.status === 'unavailable')
    return <CatalogUnavailable {...props} />;
  return <CatalogNoMatches search={props.search} />;
}

function CatalogNoMatches({
  search,
}: Pick<CatalogProps, 'search'>): React.JSX.Element {
  const title = search ? `No Agents match “${search}”` : 'No Agents found.';
  return (
    <View className="items-center gap-1 px-4 py-12">
      <Text className="type-heading text-center">{title}</Text>
      {search && (
        <Text className="type-secondary text-center">Check the spelling.</Text>
      )}
    </View>
  );
}

function CatalogUnavailable({
  catalog,
  ...refresh
}: CatalogStatusProps & CatalogRefreshProps): React.JSX.Element {
  return (
    <View role="alert" className="items-center gap-3 px-4 py-10">
      <CatalogUnavailableMessage catalog={catalog} />
      <CatalogRetry {...refresh} />
    </View>
  );
}

function CatalogUnavailableMessage({
  catalog,
}: CatalogStatusProps): React.JSX.Element {
  return (
    <View className="items-center gap-1">
      <Text className="type-heading text-center">
        Couldn’t load the registry
      </Text>
      <Text className="type-secondary text-center">
        No saved catalog yet. Try again.
      </Text>
      <Text className="type-secondary text-center">{catalog.error}</Text>
    </View>
  );
}

function CatalogRetry(props: CatalogRefreshProps): React.JSX.Element {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 shadow-none"
      onPress={props.onRefresh}
      disabled={props.refreshing}
    >
      <Text className="font-sans leading-5">Retry</Text>
    </Button>
  );
}

function CatalogStatus({ catalog }: CatalogStatusProps): React.JSX.Element {
  return (
    <View className="gap-4 pb-4">
      <Text className="type-secondary">
        For this Server · {catalog.serverPlatform}
      </Text>
      {catalog.status === 'stale' && <CatalogNotice catalog={catalog} />}
    </View>
  );
}

function CatalogNotice({ catalog }: CatalogStatusProps): React.JSX.Element {
  const title = 'Refresh failed · showing saved catalog';
  return (
    <View
      role="alert"
      className="flex-row items-start gap-2.5 rounded-lg bg-warning/8 p-3"
    >
      <Icon name="warning" className="text-warning" />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="type-heading">{title}</Text>
        <Text className="type-secondary">{catalog.error}</Text>
      </View>
    </View>
  );
}
