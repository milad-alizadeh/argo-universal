import type { AgentsCatalogOutput, RegistrySupport } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/text';
import { RegistryIcon } from './registry-icon';

type CatalogEntry = AgentsCatalogOutput['agents'][number];
type RowProps = { agent: CatalogEntry };
const distributionLabels = {
  binary: 'Binary',
  npx: 'npm · needs Node.js',
  uvx: 'Python · needs uv',
};

export function CatalogRow({ agent }: RowProps): React.JSX.Element {
  return (
    <View
      role="listitem"
      accessibilityLabel={agent.entry.name}
      className="flex-row items-start gap-3 pb-6 wide:gap-4"
    >
      <View className="size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <RegistryIcon agentName={agent.entry.name} uri={agent.entry.icon} />
      </View>
      <CatalogDescription agent={agent} />
    </View>
  );
}

function CatalogDescription({
  agent: { entry, support },
}: RowProps): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <Text role="heading" aria-level={2} className="type-body min-h-6">
        {entry.name}
      </Text>
      <Text className="type-secondary">{entry.description}</Text>
      <Text className="type-secondary pt-1">
        v{entry.version} · {supportDescription(support)}
      </Text>
    </View>
  );
}

function supportDescription(support: RegistrySupport): string {
  return support.kind === 'unsupported'
    ? support.reason
    : distributionLabels[support.kind];
}
