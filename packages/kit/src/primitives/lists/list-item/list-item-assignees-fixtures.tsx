import { Avatar } from '#primitives/content/avatar';
import { Label } from '#primitives/content/label';
import { Pill } from '#primitives/status/pill';
import type { ListItemProps } from './list-item-props';

export const assigned = {
  title: 'Review the release notes',
  subtitle: 'Draft updated today',
  meta: [
    <Avatar key="assignee" initials="SR" accessibilityLabel="Sam Rivera" />,
    <Label key="author" text="Editorial team" />,
    <Label key="review" text="Ready for a second review" />,
    <Pill key="release" text="Next release" />,
    <Pill key="priority" text="High priority" />,
  ],
} satisfies ListItemProps;
