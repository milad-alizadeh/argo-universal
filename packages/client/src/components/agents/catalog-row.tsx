import type { AgentsCatalogOutput, RegistrySupport } from '@repo/contracts';
import { RobotIcon } from 'phosphor-react-native';
import type * as React from 'react';
import { View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { Text } from '#primitives/text';
import { Icon, useIconPixels } from '../../lib/icon';

type CatalogEntry = AgentsCatalogOutput['agents'][number];
type RowProps = { agent: CatalogEntry };
type IconProps = { uri: string | undefined; name: string };
const distributionLabels = {
  binary: 'Binary for this Server',
  npx: 'npm package · requires Node.js and npm',
  uvx: 'Python package · requires uv',
};

export function CatalogRow({ agent }: RowProps): React.JSX.Element {
  return (
    <View className="flex-row gap-3 border-b border-border px-gutter py-4">
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

function RegistryIcon({ uri, name }: IconProps): React.JSX.Element {
  const pixels = useIconPixels('lg');
  if (!uri) return <Icon as={RobotIcon} size="lg" />;
  return (
    <SvgUri
      uri={uri}
      width={pixels}
      height={pixels}
      accessibilityRole="image"
      accessibilityLabel={`${name} icon`}
      fallback={<Icon as={RobotIcon} size="lg" />}
    />
  );
}

function supportDescription(support: RegistrySupport): string {
  return support.kind === 'unsupported'
    ? support.reason
    : distributionLabels[support.kind];
}
