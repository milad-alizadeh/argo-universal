import type * as React from 'react';
import { Linking, View } from 'react-native';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { IconButton } from '#primitives/buttons/icon-button';
import { Text } from '#primitives/display/text';
import { Tooltip } from '#primitives/overlays/tooltip';
import type { AgentRowEntry } from '../../state/agent-rows';

type Link = { url?: string; label: string; icon: IconName };

const linksOf = (agent: AgentRowEntry): Link[] => [
  {
    url: agent.repository,
    label: 'Repository',
    icon: 'repository',
  },
  { url: agent.website, label: 'Website', icon: 'web' },
  {
    url: agent.license_url,
    label: 'License or terms',
    icon: 'file',
  },
];

type AgentLinkProps = { agent: AgentRowEntry };

export function AgentFooter({ agent }: AgentLinkProps): React.JSX.Element {
  return (
    <View className="gap-1">
      {agent.unavailable && (
        <Text role="secondary" tone="muted">
          Not supported on this platform
        </Text>
      )}
      <AgentLinks agent={agent} />
    </View>
  );
}

function AgentLinks({ agent }: { agent: AgentRowEntry }): React.JSX.Element {
  return (
    <View className="relative -left-2 flex-row items-center gap-2">
      {linksOf(agent).map((link) => (
        <AgentLink key={link.label} link={link} />
      ))}
    </View>
  );
}

function AgentLink({ link }: { link: Link }): React.JSX.Element | null {
  if (!link.url) return null;
  const url = link.url;

  return (
    <Tooltip label={link.label}>
      <IconButton
        icon={link.icon}
        size="xs"
        variant="ghost"
        accessibilityLabel={link.label}
        onPress={() => void Linking.openURL(url)}
      />
    </Tooltip>
  );
}
