import type * as React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { type AgentDetail } from '#features/agents';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';

type AgentLink = NonNullable<AgentDetail['links']>[number];

// The registry entry's GitHub, Licence and Website links, wrapping onto a second line on a narrow screen, each opening outside the App.
export function AgentLinks({
  links,
}: Pick<AgentDetail, 'links'>): React.JSX.Element | null {
  if (!links?.length) return null;

  return (
    <GroupedListItem label="Links" accessory={<LinkList links={links} />} />
  );
}

function LinkList({
  links,
}: {
  links: readonly AgentLink[];
}): React.JSX.Element {
  return (
    <View className="shrink flex-row flex-wrap items-center justify-end gap-x-4 gap-y-1">
      {links.map((link) => (
        <ExternalLink key={link.url} link={link} />
      ))}
    </View>
  );
}

function ExternalLink({ link }: { link: AgentLink }): React.JSX.Element {
  return (
    <Pressable
      role="link"
      accessibilityLabel={link.label}
      onPress={() => void Linking.openURL(link.url)}
      className="flex-row items-center gap-1"
    >
      <Text role="body">{link.label}</Text>
      <ExternalLinkIcon />
    </Pressable>
  );
}

function ExternalLinkIcon(): React.JSX.Element {
  return (
    <Icon
      name="external-link"
      role="control"
      className="text-muted-foreground"
    />
  );
}
