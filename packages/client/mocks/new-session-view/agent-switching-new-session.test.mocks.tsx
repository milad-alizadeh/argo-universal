import type { SlashCommand } from '@repo/contracts';
import { useState } from 'react';
import type * as React from 'react';
import {
  SessionNewView,
  type ReadySessionNewViewProps,
} from '../../src/screens/sessions/$id/session-new-view';

type Agent = ReadySessionNewViewProps['agents'][number];

// The Server keeps one list per Agent; New Session offers the chosen Agent's.
export const reviewCommand = { name: 'review', description: 'Review changes' };

export const deployCommand = {
  name: 'deploy',
  description: 'Deploy the build',
};

const commandsFor = (agents: Agent[]): Record<string, SlashCommand[]> =>
  Object.fromEntries(
    agents.map((agent, index) => [
      agent.id,
      [index === 0 ? reviewCommand : deployCommand],
    ]),
  );

// New Session whose chosen Agent and Slash commands follow the person's choice, as the screen's wiring does.
export function AgentSwitchingNewSession(
  view: ReadySessionNewViewProps,
): React.JSX.Element {
  const [chosenId, setChosenId] = useState(view.configuration.agent?.id ?? '');
  const chosen = view.agents.find((agent) => agent.id === chosenId);

  return (
    <SessionNewView
      {...view}
      state="ready"
      slashCommands={commandsFor(view.agents)[chosenId]}
      configuration={{ ...view.configuration, agent: chosen }}
      onAgentChange={setChosenId}
    />
  );
}
