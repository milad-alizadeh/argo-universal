import { encodedIcon } from '../registry-icons.mocks';
import type { AgentListItemProps } from './agent-list-item';

// A story supplies Install and Remove; a fixture is the Registry's row for one Agent.
type AgentListItemFixture = Omit<AgentListItemProps, 'onInstall' | 'onRemove'>;

// The Registry's own entry, with both of the links the card draws.
const registryAgent = {
  id: 'example-agent',
  name: 'Example Agent',
  version: '1.2.3',
  description: 'A compatible coding Agent',
  icon: encodedIcon,
  repository: 'https://example.org/repository',
  website: 'https://example.org/website',
};

// Not installed here: the card's one action adds the Agent.
export const installableAgent = {
  agent: { ...registryAgent, installed: false, unavailable: false },
} satisfies AgentListItemFixture;

// Installed: the same place holds Remove, in the danger tone.
export const installedAgent = {
  agent: { ...registryAgent, installed: true, unavailable: false },
} satisfies AgentListItemFixture;

// The Registry cannot run it on this platform: the card names the status instead of an action.
export const unavailableAgent = {
  agent: { ...registryAgent, installed: false, unavailable: true },
} satisfies AgentListItemFixture;
