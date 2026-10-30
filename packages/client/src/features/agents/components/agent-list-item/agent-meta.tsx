import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Label } from '@repo/kit/primitives/content/label';
import { Tooltip } from '@repo/kit/primitives/overlays/tooltip';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type { IconName } from '@repo/kit/symbols/icon-names';
import type * as React from 'react';
import { Linking } from 'react-native';
import type { AgentRowEntry } from '../../utils/agent-rows';
import { unavailableIcon, unsupportedLabel } from './agent-button';

type Link = { url?: string; label: string; icon: IconName };

// Two links only, the repository and the website (owner, 2026-10-19).
const linksOf = (agent: AgentRowEntry): Link[] => [
  {
    url: agent.repository,
    label: 'Repository',
    icon: 'code',
  },
  { url: agent.website, label: 'Website', icon: 'web' },
];

type AgentMetaProps = { agent: AgentRowEntry };

// One line, every item centred on the text and spaced by the row's own gap: version, then desktop's unsupported note; the links follow as the row's accessories.
export function AgentMeta({ agent }: AgentMetaProps): React.JSX.Element {
  return (
    <>
      <Label text={`v${agent.version}`} />
      <UnsupportedNote agent={agent} />
    </>
  );
}

// The links are buttons of their own, so the row draws them beside its press, where a screen reader reaches each.
export function AgentLinks({ agent }: AgentMetaProps): React.JSX.Element {
  return (
    <>
      {linksOf(agent).map((link) => (
        <AgentLink key={link.label} link={link} />
      ))}
    </>
  );
}

// Phones say it with the trailing status icon's label instead; desktop draws the same icon beside the words.
function UnsupportedNote({ agent }: AgentMetaProps): React.JSX.Element | null {
  return agent.unavailable ? (
    <SizeClass only="wide">
      <Label icon={unavailableIcon} text={unsupportedLabel} />
    </SizeClass>
  ) : null;
}

const linkButton = (link: Link, url: string): React.JSX.Element => (
  <IconButton
    icon={link.icon}
    size="sm"
    variant="ghost"
    accessibilityLabel={link.label}
    onPress={() => void Linking.openURL(url)}
  />
);

function AgentLink({ link }: { link: Link }): React.JSX.Element | null {
  if (!link.url) return null;

  return <Tooltip label={link.label}>{linkButton(link, link.url)}</Tooltip>;
}
