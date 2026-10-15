import type * as React from 'react';
import { headerFilterIcon } from '#lib/product/header-button';
import type { HeaderItem } from '#lib/product/navigation/header-items';
import { IconButton } from '#primitives/buttons/icon-button';
import { Menu } from '#primitives/overlays/menu';

const sessionsFilterChoices = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
] as const;

export interface SessionsFilterMenuProps {
  archived: boolean;
  onArchivedChange: (archived: boolean) => void;
}

const filterTrigger = (
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

// Active or Archived, in the wide window's list header.
export function SessionsFilterMenu({
  archived,
  onArchivedChange,
}: SessionsFilterMenuProps): React.JSX.Element {
  return (
    <Menu
      accessibilityLabel="Filter Sessions"
      value={archived ? 'archived' : 'active'}
      options={sessionsFilterChoices}
      onValueChange={(value) => onArchivedChange(value === 'archived')}
      trigger={filterTrigger}
    />
  );
}

// The same choices as a phone header item, with a dot while Archived shows.
export const sessionsFilterItem = ({
  archived,
  onArchivedChange,
}: SessionsFilterMenuProps): HeaderItem => ({
  icon: headerFilterIcon,
  accessibilityLabel: 'Filter Sessions',
  dot: archived ? 'filter' : undefined,
  menu: sessionsFilterChoices.map(({ value, label }) => ({
    label,
    selected: (value === 'archived') === archived,
    onPress: () => onArchivedChange(value === 'archived'),
  })),
});
