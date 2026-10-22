import type { AgentServer } from '@repo/contracts';
import { IconSlot } from '@repo/kit/primitives/content/icon';
import type { IconRoleValue } from '@repo/kit/symbols/icon-role';
import type * as React from 'react';
import { AgentLogo } from '#features/agents';

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
        logo={agent.icon ?? ''}
        label={agent.name}
        role={role}
        testID="composer-agent-icon"
      />
    </IconSlot>
  ) : null;
}
