import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '#lib/generic/primitives/button';
import { Text } from '#lib/generic/primitives/text';
import { LoadError } from '#lib/product/load-error';
import { useNavigate } from '#lib/product/navigation/context';
import { AgentCatalog } from '../components/catalog';
import {
  CatalogSearch,
  type CatalogSearchProps,
} from '../components/catalog-search';
import { CustomAgentRows } from '../components/custom-agent-rows';
import { useAgentCatalog } from '../hooks/use-agent-catalog';
import { useCustomAgents } from '../hooks/use-custom-agents';

type CatalogState = ReturnType<typeof useAgentCatalog>;
type CatalogViewProps = { catalog: CatalogState };
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
      <CustomAgents />
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
      <AddCustomAgent />
      <RefreshCatalog catalog={catalog} />
    </View>
  );
}

function CustomAgents(): React.JSX.Element {
  const navigate = useNavigate();
  const agents = useCustomAgents().data ?? [];
  return (
    <CustomAgentRows
      agents={agents.map(({ id, definition }) => ({
        id,
        name: definition.name,
      }))}
      onOpen={(agent) => navigate({ to: 'settings-agent', agent })}
    />
  );
}

function AddCustomAgent(): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 shadow-none"
      onPress={() => navigate({ to: 'settings-agent-new' })}
    >
      <Text className="font-sans leading-5">Add custom</Text>
    </Button>
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
