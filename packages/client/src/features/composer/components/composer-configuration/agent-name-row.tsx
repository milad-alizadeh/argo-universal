import type { ReactElement } from 'react';
import { ListItem } from '#primitives/lists/list-item';
import { ConfigurationRowIcon } from './configuration-row-icon';
import type { ComposerConfigurationProps } from './configuration-types';

/*
 * The Agent that nothing else names. A running Session's Configure draws no Agent row, because the page is already
 * titled with the Agent's name — but an Agent that is not installed, or not loaded yet, has no name to be titled
 * with, and only its id is known. That id is said here or nowhere (owner, 2026-10-21).
 */
export function AgentNameRow({
  configuration,
}: {
  configuration: ComposerConfigurationProps;
}): ReactElement | null {
  const { agent, agentId } = configuration;

  if (agent || !agentId) return null;

  return (
    <ListItem
      title="Agent"
      value={agentId}
      leading={<ConfigurationRowIcon name="agent" />}
    />
  );
}
