import type * as React from 'react';
import type { ReactElement } from 'react';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';

export interface AgentIdentityProps {
  logo: ReactElement;
  description: string;
  // The status chip, or Install for a registry Agent.
  trailing: ReactElement;
}

/*
 * A wide window's first card on an Agent page, under a header that names the Agent alone; a phone opens on its centred summary instead.
 * GroupedList takes its sections, and each section its rows, as direct children, so this is called rather than rendered.
 */
export function agentIdentity(
  props: AgentIdentityProps,
  wide: boolean,
): React.JSX.Element | null {
  if (!wide) return null;

  return (
    <GroupedListSection key="identity">
      <IdentityRow {...props} />
    </GroupedListSection>
  );
}

function IdentityRow(props: AgentIdentityProps): React.JSX.Element {
  return (
    <GroupedListItem
      size="lg"
      tone="muted"
      label={props.description}
      leading={props.logo}
      accessory={props.trailing}
    />
  );
}
