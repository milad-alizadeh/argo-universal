import type { Subagent } from '@repo/contracts';
import type { JSX } from 'react';
import { Avatar, type AvatarProps } from '#primitives/content/avatar';
import { Icon } from '#primitives/content/icon';
import { ListItem, type ListItemProps } from '#primitives/lists/list-item';
import { sessionStatusDot } from '../../session-status-dot';
import { subagentStatusLabel, subagentSupporting } from './subagent-format';
import { type SubagentRole, subagentRole } from './subagent-role';

export type SubagentRowProps = {
  subagent: Subagent;
  now: number;
  wide: boolean;
  onSelect?: (subagent: Subagent) => void;
};

type RoleAvatarProps = { role: SubagentRole; subagent: Subagent };

const roleAvatarStatus = ({
  subagent,
}: RoleAvatarProps): Pick<
  AvatarProps,
  'status' | 'statusSurface' | 'testID'
> => ({
  status: avatarStatus(subagent),
  statusSurface: 'none',
  testID: 'subagent',
});

/*
 * Paper "Components / SubagentRow": the role's glyph on a circle tinted by the role's tone, with the SessionRow status
 * dot pinned to its top-right corner while the Subagent runs or waits; a finished row has none and dims instead.
 */
function RoleAvatar(props: RoleAvatarProps): JSX.Element {
  const { role } = props;

  return (
    <Avatar
      size="md"
      tone={role.tone}
      {...roleAvatarStatus(props)}
      decorative
      initials=""
      accessibilityLabel={role.name}
    >
      <Icon name={role.icon} role="body" weight="light" />
    </Avatar>
  );
}

function avatarStatus(subagent: Subagent): AvatarProps['status'] {
  if (subagent.state === 'idle') return undefined;

  return sessionStatusDot(
    subagent.state === 'running' ? 'running' : 'needs_input',
  );
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

// Desktop draws the row as a sidebar row; phones push a page.
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
      avatar={<RoleAvatar role={role} subagent={subagent} />}
      dimmed={subagent.state === 'idle'}
      accessibilityLabel={rowLabel(subagent, role, props.now)}
    />
  );
}
