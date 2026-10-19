import type { AgentServer } from '@repo/contracts';
import type * as React from 'react';
import { AgentLogo } from '#features/agents';
import { IconSlot } from '#primitives/content/icon';
import type { IconRoleValue } from '../../../../lib/generic/symbols/icon-role';
import { pickerAgentLogo } from './picker-agent-logos';

interface AgentIconProps {
  agent?: AgentServer;
  role?: IconRoleValue;
}

export function AgentIcon({
  agent,
  role = { compact: 'body', wide: 'row' },
}: AgentIconProps): React.JSX.Element | null {
  return agent ? (
    <IconSlot role={role}>
      <AgentLogo
        logo={agentLogo(agent)}
        label={agent.name}
        role={role}
        testID="composer-agent-icon"
      />
    </IconSlot>
  ) : null;
}

const agentLogo = (agent: AgentServer): string =>
  pickerAgentLogo(agent.icon ?? '');
