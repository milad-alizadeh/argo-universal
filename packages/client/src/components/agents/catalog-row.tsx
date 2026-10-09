import type { AgentsCatalogOutput, RegistrySupport } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import { RegistryIcon } from './registry-icon';

type CatalogEntry = AgentsCatalogOutput['agents'][number];
type RowProps = { agent: CatalogEntry };
const distributionLabels = {
  binary: 'Binary for this Server',
  npx: 'npm package · requires Node.js and npm',
  uvx: 'Python package · requires uv',
};

export function CatalogRow({ agent }: RowProps): React.JSX.Element {
  return (
    <View
      role="listitem"
      accessibilityLabel={agent.entry.name}
      className="flex-row gap-3 border-b border-border px-gutter py-4"
    >
      <RegistryIcon name={agent.entry.name} uri={agent.entry.icon} />
      <CatalogDescription agent={agent} />
    </View>
  );
}

function CatalogDescription({
  agent: { entry, support },
}: RowProps): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 gap-1">
      <Text role="heading" aria-level={2} className="font-semibold">
        {entry.name}
      </Text>
      <Text variant="muted">{entry.id}</Text>
      <Text>{entry.description}</Text>
      <Text variant="small">Version {entry.version}</Text>
      <Text variant="muted">{supportDescription(support)}</Text>
    </View>
  );
}

function supportDescription(support: RegistrySupport): string {
  return support.kind === 'unsupported'
    ? support.reason
    : distributionLabels[support.kind];
}
