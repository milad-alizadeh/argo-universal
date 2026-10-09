import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { AgentCatalog } from '#components/agents/catalog';
import { LoadError } from '#components/load-error';
import { Button } from '#primitives/button';
import { Input } from '#primitives/input';
import { Text } from '#primitives/text';
import { useAgentCatalog } from './use-agent-catalog';

type CatalogState = ReturnType<typeof useAgentCatalog>;
type CatalogViewProps = { catalog: CatalogState };
interface CatalogControlsProps {
  search: string;
  onSearch: (search: string) => void;
  catalog: CatalogState;
}

export function AgentsSettingsScreen(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const catalog = useAgentCatalog(search);
  return (
    <View className="flex-1 min-h-0 bg-background">
      <CatalogControls search={search} onSearch={setSearch} catalog={catalog} />
      <CatalogResult catalog={catalog} />
    </View>
  );
}

function CatalogControls({
  search,
  onSearch,
  catalog,
}: CatalogControlsProps): React.JSX.Element {
  return (
    <View className="gap-3 px-gutter py-4">
      <CatalogHeading catalog={catalog} />
      <Text variant="muted">
        Browse the public ACP Registry for the connected Server.
      </Text>
      <CatalogSearch search={search} onSearch={onSearch} />
    </View>
  );
}

function CatalogHeading({
  catalog,
}: {
  catalog: CatalogState;
}): React.JSX.Element {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text role="heading" aria-level={1} variant="h3">
        Agents
      </Text>
      <RefreshCatalog catalog={catalog} />
    </View>
  );
}

function RefreshCatalog({ catalog }: CatalogViewProps): React.JSX.Element {
  return (
    <Button
      variant="outline"
      size="sm"
      accessibilityLabel="Refresh catalog"
      disabled={catalog.refreshing}
      onPress={catalog.refresh}
    >
      <Text>{catalog.refreshing ? 'Refreshing…' : 'Refresh'}</Text>
    </Button>
  );
}

function CatalogResult({
  catalog,
}: {
  catalog: CatalogState;
}): React.JSX.Element {
  if (catalog.query.data) return <AgentCatalog catalog={catalog.query.data} />;
  if (catalog.query.isError) return <CatalogError catalog={catalog} />;
  return (
    <Text role="status" className="px-gutter py-4 text-muted-foreground">
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
      description={catalog.query.error?.message ?? 'The Server did not answer'}
      onRetry={catalog.refresh}
    />
  );
}

function CatalogSearch({
  search,
  onSearch,
}: Pick<CatalogControlsProps, 'search' | 'onSearch'>): React.JSX.Element {
  return (
    <Input
      accessibilityLabel="Search Agents"
      placeholder="Search Agents"
      value={search}
      onChangeText={onSearch}
      autoCapitalize="none"
    />
  );
}
