import type { AgentServer } from '@repo/contracts';
import { IconSlot } from '@repo/kit/primitives/content/icon';
import type { IconSizeValue } from '@repo/kit/symbols/icon-size';
import type * as React from 'react';
import { AgentLogo } from '#features/agents';

interface AgentIconProps {
  agent?: AgentServer;
  size?: IconSizeValue;
}

const defaultSize: IconSizeValue = { compact: 'sm', wide: 'md' };

export function AgentIcon({
  agent,
  size = defaultSize,
}: AgentIconProps): React.JSX.Element | null {
  return agent ? (
    <IconSlot size={size}>
      <AgentLogo
        logo={agent.icon ?? ''}
        label={agent.name}
        size={size}
        testID="composer-agent-icon"
      />
    </IconSlot>
  ) : null;
}
