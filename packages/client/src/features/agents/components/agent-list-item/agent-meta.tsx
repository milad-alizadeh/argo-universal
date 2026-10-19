import type * as React from 'react';
import { Linking } from 'react-native';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { IconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import { Tooltip } from '#primitives/overlays/tooltip';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import type { AgentRowEntry } from '../../utils/agent-rows';
import { unsupportedLabel } from './agent-button';

type Link = { url?: string; label: string; icon: IconName };

// Two links only, the repository and the website (owner, 2026-10-19).
const linksOf = (agent: AgentRowEntry): Link[] => [
  { url: agent.repository, label: 'Repository', icon: 'repository' },
  { url: agent.website, label: 'Website', icon: 'web' },
];

type AgentMetaProps = { agent: AgentRowEntry };

// One line, every item centred on the text and spaced by the row's own gap: version, desktop's unsupported note, then the links.
export function AgentMeta({ agent }: AgentMetaProps): React.JSX.Element {
  return (
    <>
      <Text role="secondary" tone="muted">
        v{agent.version}
      </Text>
      <UnsupportedNote agent={agent} />
      {linksOf(agent).map((link) => (
        <AgentLink key={link.label} link={link} />
      ))}
    </>
  );
}

// Phones say it with the trailing status icon's label instead.
function UnsupportedNote({ agent }: AgentMetaProps): React.JSX.Element | null {
  return agent.unavailable ? (
    <SizeClass only="wide">
      <Text role="secondary" tone="muted">
        {unsupportedLabel}
      </Text>
    </SizeClass>
  ) : null;
}

// A glyph on the text line with the row's gap around it; its hit area bleeds past it.
const linkButton = (link: Link, url: string): React.JSX.Element => (
  <IconButton
    icon={link.icon}
    size="xs"
    variant="ghost"
    iconTone="muted"
    bleed
    accessibilityLabel={link.label}
    onPress={() => void Linking.openURL(url)}
  />
);

function AgentLink({ link }: { link: Link }): React.JSX.Element | null {
  if (!link.url) return null;

  return <Tooltip label={link.label}>{linkButton(link, link.url)}</Tooltip>;
}
