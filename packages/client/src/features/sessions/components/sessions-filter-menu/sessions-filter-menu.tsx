import type * as React from 'react';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { HeaderButton, headerFilterIcon } from '#lib/product/header-button';
import { IconButton } from '#primitives/buttons/icon-button';
import { Menu, type MenuChoiceGroup } from '#primitives/overlays/menu';
import {
  isSessionsLayout,
  type SessionsLayout,
  sessionsLayoutChoices,
} from '../../state/sessions-layout';

export const sessionsFilterChoices = [
  { value: 'active', label: 'Active', icon: 'active-sessions' },
  { value: 'archived', label: 'Archived', icon: 'archived-sessions' },
] as const;

export const sessionsLayoutLabel = 'Layout';

export interface SessionsFilterMenuProps {
  archived: boolean;
  onArchivedChange: (archived: boolean) => void;
  layout: SessionsLayout;
  onLayoutChange: (layout: SessionsLayout) => void;
}

const wideFilterTrigger = (
  <IconButton
    variant="ghost"
    className="size-7 sm:size-7"
    icon={'filters'}
    iconRole="action"
    iconClassName={'text-muted-foreground'}
    accessibilityLabel="Filter Sessions"
    size="sm"
  />
);

function phoneFilterTrigger(archived: boolean): React.JSX.Element {
  return (
    <HeaderButton
      icon={headerFilterIcon}
      paired
      dot={archived ? 'filter' : undefined}
      accessibilityLabel="Filter Sessions"
    />
  );
}

const archivedGroup = ({
  archived,
  onArchivedChange,
}: SessionsFilterMenuProps): MenuChoiceGroup => ({
  value: archived ? 'archived' : 'active',
  options: sessionsFilterChoices,
  onValueChange: (value) => onArchivedChange(value === 'archived'),
});

const layoutGroup = ({
  layout,
  onLayoutChange,
}: SessionsFilterMenuProps): MenuChoiceGroup => ({
  label: sessionsLayoutLabel,
  value: layout,
  options: sessionsLayoutChoices,
  onValueChange: (value) => {
    if (isSessionsLayout(value)) onLayoutChange(value);
  },
});

// Active or Archived first; then, under Layout, Regular or Compact rows.
const filterGroups = (props: SessionsFilterMenuProps): MenuChoiceGroup[] => [
  archivedGroup(props),
  layoutGroup(props),
];

// What the list shows and how it lays out its rows; on a phone the trigger is a native header item with a dot while Archived shows.
export function SessionsFilterMenu(
  props: SessionsFilterMenuProps,
): React.JSX.Element {
  const wide = useWide();

  return (
    <Menu
      accessibilityLabel="Filter Sessions"
      groups={filterGroups(props)}
      trigger={wide ? wideFilterTrigger : phoneFilterTrigger(props.archived)}
    />
  );
}
