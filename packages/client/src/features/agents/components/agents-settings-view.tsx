import type * as React from 'react';
import { View } from 'react-native';
import { Button } from '#lib/generic/primitives/button';
import { Text } from '#lib/generic/primitives/text';
import { LoadError } from '#lib/product/load-error';
import type { CatalogLoad } from '../state/catalog-sync';
import { AgentCatalog } from './catalog';
import { CatalogSearch, type CatalogSearchProps } from './catalog-search';
import { CustomAgentRows, type CustomAgentRowEntry } from './custom-agent-rows';

export type CatalogRefreshProps = {
  refreshing: boolean;
  onRefresh: () => void;
};
export type AgentsSettingsViewProps = CatalogSearchProps &
  CatalogRefreshProps & {
    catalog: CatalogLoad;
    customAgents: CustomAgentRowEntry[];
    onAddCustomAgent: () => void;
    onOpenCustomAgent: (agentId: string) => void;
  };
type HeadingProps = Pick<
  AgentsSettingsViewProps,
  'catalog' | 'refreshing' | 'onRefresh' | 'onAddCustomAgent'
>;
type ResultProps = Pick<
  AgentsSettingsViewProps,
  'catalog' | 'search' | 'refreshing' | 'onRefresh'
>;

export function AgentsSettingsView(
  props: AgentsSettingsViewProps,
): React.JSX.Element {
  return (
    <View className="flex-1 min-h-0 bg-background p-4">
      <CatalogControls {...props} />
      <CustomAgentRows
        agents={props.customAgents}
        onOpen={props.onOpenCustomAgent}
      />
      <CatalogResult {...props} />
    </View>
  );
}

function CatalogControls(
  props: CatalogSearchProps & HeadingProps,
): React.JSX.Element {
  return (
    <View className="gap-8 pb-0.5">
      <CatalogSearch search={props.search} onSearch={props.onSearch} />
      <CatalogHeading {...props} />
    </View>
  );
}

function CatalogHeading(props: HeadingProps): React.JSX.Element {
  return (
    <View className="h-8 flex-row items-center gap-2">
      <Text role="heading" aria-level={1} className="type-heading">
        Agents
      </Text>
      <Text className="type-secondary flex-1">
        {props.catalog.status === 'loaded' &&
          props.catalog.catalog.agents.length}
      </Text>
      <HeadingButton label="Add custom" onPress={props.onAddCustomAgent} />
      <RefreshCatalog {...props} />
    </View>
  );
}

function RefreshCatalog(props: CatalogRefreshProps): React.JSX.Element {
  return (
    <HeadingButton
      label={props.refreshing ? 'Refreshing…' : 'Refresh'}
      accessibilityLabel="Refresh catalog"
      disabled={props.refreshing}
      onPress={props.onRefresh}
    />
  );
}

type HeadingButtonProps = {
  label: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  onPress: () => void;
};

function HeadingButton({
  label,
  ...button
}: HeadingButtonProps): React.JSX.Element {
  return (
    <Button variant="outline" size="sm" className="h-8 shadow-none" {...button}>
      <Text className="font-sans leading-5">{label}</Text>
    </Button>
  );
}

function CatalogResult(props: ResultProps): React.JSX.Element {
  const { catalog, onRefresh, refreshing } = props;
  if (catalog.status === 'failed')
    return <CatalogFailed message={catalog.message} onRefresh={onRefresh} />;
  if (catalog.status === 'loading') return <CatalogLoading />;
  return (
    <AgentCatalog
      catalog={catalog.catalog}
      search={props.search}
      retry={{ refresh: onRefresh, refreshing }}
    />
  );
}

function CatalogFailed(props: {
  message: string;
  onRefresh: () => void;
}): React.JSX.Element {
  return (
    <LoadError
      title="Could not load the catalog"
      description={props.message}
      onRetry={props.onRefresh}
    />
  );
}

function CatalogLoading(): React.JSX.Element {
  return (
    <Text role="status" className="type-secondary py-4">
      Loading the Agent catalog…
    </Text>
  );
}
