import type { Subagent } from '@repo/contracts';
import type { JSX, ReactNode } from 'react';
import { Avatar } from '#primitives/content/avatar';
import { Icon } from '#primitives/content/icon';
import { ListItem, type ListItemProps } from '#primitives/lists/list-item';
import { StatusDot } from '#primitives/status/status-dot';
import { sessionStatusDot } from '../../session-status-dot';
import { subagentStatusLabel, subagentSupporting } from './subagent-format';
import { type SubagentRole, subagentRole } from './subagent-role';

export type SubagentRowProps = {
  subagent: Subagent;
  now: number;
  wide: boolean;
  onSelect?: (subagent: Subagent) => void;
};

// Paper "Components / SubagentRow": the role's glyph on a circle tinted by the role's tone.
function RoleAvatar({ role }: { role: SubagentRole }): JSX.Element {
  return (
    <Avatar
      size="md"
      tone={role.tone}
      decorative
      initials=""
      accessibilityLabel={role.name}
    >
      <Icon name={role.icon} role="body" />
    </Avatar>
  );
}

// The SessionRow status dot: running and waiting Subagents only; a finished row has none and dims instead.
function statusDot(subagent: Subagent): ReactNode {
  if (subagent.state === 'idle') return undefined;

  const status = subagent.state === 'running' ? 'running' : 'needs_input';

  return <StatusDot {...sessionStatusDot(status)} testID="subagent-status" />;
}

function rowLabel(subagent: Subagent, role: SubagentRole, now: number): string {
  return [
    subagent.title,
    role.name,
    subagentStatusLabel(subagent),
    subagentSupporting(subagent, now),
  ]
    .filter(Boolean)
    .join(', ');
}

type RowPlacement = Pick<ListItemProps, 'sidebar' | 'disclosure' | 'onPress'>;

// Desktop draws the row as a sidebar row, the dot ending its title line as on SessionRow; phones push a page.
function rowPlacement({
  wide,
  onSelect,
  subagent,
}: SubagentRowProps): RowPlacement {
  const sidebar = wide ? 'regular' : undefined;

  if (!onSelect) return { sidebar };

  return { sidebar, disclosure: !wide, onPress: () => onSelect(subagent) };
}

export function SubagentRow(props: SubagentRowProps): JSX.Element {
  const { subagent } = props;
  const role = subagentRole(subagent);

  return (
    <ListItem
      {...rowPlacement(props)}
      title={subagent.title}
      subtitle={subagentSupporting(subagent, props.now)}
      avatar={<RoleAvatar role={role} />}
      trailing={statusDot(subagent)}
      dimmed={subagent.state === 'idle'}
      accessibilityLabel={rowLabel(subagent, role, props.now)}
    />
  );
}
