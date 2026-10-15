import type * as React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import type { AgentDetail } from '../../state/agent-detail-types';

type AgentLink = NonNullable<AgentDetail['links']>[number];

/*
 * The registry entry's GitHub, Licence and Website links, each opening outside the App.
 * A section takes each child as one row, so this is called rather than rendered, to leave no empty row.
 */
export function agentLinks(
  links: AgentDetail['links'],
): React.JSX.Element | null {
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
    <View className="flex-row items-center gap-4">
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
