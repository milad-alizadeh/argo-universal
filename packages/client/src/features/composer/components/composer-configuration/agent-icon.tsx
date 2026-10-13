import type { AgentInfo } from '@repo/contracts';
import type * as React from 'react';
import { AgentLogo } from '#features/agents';
import { IconSlot } from '../../../../lib/generic/symbols/icon';
import type { IconRole } from '../../../../lib/generic/symbols/icon-role';

interface AgentIconProps {
  agent?: AgentInfo;
  role?: IconRole;
}
export function AgentIcon({
  agent,
  role = 'control',
}: AgentIconProps): React.JSX.Element | null {
  return agent ? (
    <IconSlot role={role}>
      <AgentLogo
        logo={agent.logo}
        label={agent.label}
        role={role}
        testID="composer-agent-icon"
      />
    </IconSlot>
  ) : null;
}
