import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { AgentCatalog } from '#components/agents/catalog';
import { LoadError } from '#components/load-error';
import { Button } from '#primitives/button';
import { Input } from '#primitives/input';
import { Text } from '#primitives/text';
import { Icon } from '../../lib/icon';
import { useAgentCatalog } from './use-agent-catalog';

type CatalogState = ReturnType<typeof useAgentCatalog>;
type CatalogViewProps = { catalog: CatalogState };
type CatalogSearchProps = Pick<CatalogControlsProps, 'search' | 'onSearch'>;
type CatalogResultProps = CatalogViewProps & Pick<CatalogSearchProps, 'search'>;
interface CatalogControlsProps {
  search: string;
  onSearch: (search: string) => void;
  catalog: CatalogState;
}

export function AgentsSettingsScreen(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const catalog = useAgentCatalog(search);
  return (
    <View className="flex-1 min-h-0 bg-background p-4">
      <CatalogControls search={search} onSearch={setSearch} catalog={catalog} />
      <CatalogResult catalog={catalog} search={search} />
    </View>
  );
}

function CatalogControls({
  search,
  onSearch,
  catalog,
}: CatalogControlsProps): React.JSX.Element {
  return (
    <View className="gap-8 pb-0.5">
      <CatalogSearch search={search} onSearch={onSearch} />
      <CatalogHeading catalog={catalog} />
    </View>
  );
}

function CatalogHeading({ catalog }: CatalogViewProps): React.JSX.Element {
  return (
    <View className="h-8 flex-row items-center gap-2">
      <Text role="heading" aria-level={1} className="type-heading">
        Agents
      </Text>
      <Text className="type-secondary flex-1">
        {catalog.catalog?.agents.length}
      </Text>
      <RefreshCatalog catalog={catalog} />
    </View>
  );
}

function RefreshCatalog({ catalog }: CatalogViewProps): React.JSX.Element {
  const label = catalog.refreshing ? 'Refreshing…' : 'Refresh';
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 shadow-none"
      accessibilityLabel="Refresh catalog"
      disabled={catalog.refreshing}
      onPress={catalog.refresh}
    >
      <Text className="font-sans leading-5">{label}</Text>
    </Button>
  );
}

function CatalogResult({
  catalog,
  search,
}: CatalogResultProps): React.JSX.Element {
  if (catalog.catalog)
    return (
      <AgentCatalog catalog={catalog.catalog} search={search} retry={catalog} />
    );
  if (catalog.error) return <CatalogError catalog={catalog} />;
  return <CatalogLoading />;
}

function CatalogLoading(): React.JSX.Element {
  return (
    <Text role="status" className="type-secondary py-4">
      Loading the Agent catalog…
    </Text>
  );
}

function CatalogError({
  catalog,
}: {
  catalog: CatalogState;
}): React.JSX.Element {
  return (
    <LoadError
      title="Could not load the catalog"
      description={catalog.error?.message ?? 'The Server did not answer'}
      onRetry={catalog.refresh}
    />
  );
}

function CatalogSearch(props: CatalogSearchProps): React.JSX.Element {
  return (
    <View className="h-10 flex-row items-center gap-2 rounded-lg bg-muted px-3">
      <Icon name="search" className="text-muted-foreground" />
      <CatalogSearchInput {...props} />
    </View>
  );
}

function CatalogSearchInput({
  search,
  onSearch,
}: CatalogSearchProps): React.JSX.Element {
  return (
    <Input
      className="type-body h-10 sm:h-10 flex-1 border-0 rounded-none bg-transparent dark:bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
      accessibilityLabel="Search Agents"
      placeholder="Search Agents"
      value={search}
      onChangeText={onSearch}
      autoCapitalize="none"
    />
  );
}
