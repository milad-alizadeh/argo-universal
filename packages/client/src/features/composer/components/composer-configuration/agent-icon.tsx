import type { AgentInfo } from '@repo/contracts';
import type * as React from 'react';
import { AgentLogo } from '#features/agents';
import { IconSlot } from '#primitives/display/icon';
import type { IconRoleValue } from '../../../../lib/generic/symbols/icon-role';

interface AgentIconProps {
  agent?: AgentInfo;
  role?: IconRoleValue;
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
