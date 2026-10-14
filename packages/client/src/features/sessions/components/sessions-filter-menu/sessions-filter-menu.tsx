import type * as React from 'react';
import { HeaderButton } from '#lib/product/header-button';
import { IconButton } from '#primitives/buttons/icon-button';
import { Menu } from '#primitives/overlays/menu';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';

const sessionsFilterChoices = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
] as const;

export interface SessionsFilterMenuProps {
  archived: boolean;
  onArchivedChange: (archived: boolean) => void;
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
      icon="filters"
      paired
      dot={archived ? 'filter' : undefined}
      accessibilityLabel="Filter Sessions"
    />
  );
}

// Active or Archived; on a phone the trigger is a native header item with a dot while Archived shows.
export function SessionsFilterMenu({
  archived,
  onArchivedChange,
}: SessionsFilterMenuProps): React.JSX.Element {
  const wide = useWide();

  return (
    <Menu
      accessibilityLabel="Filter Sessions"
      value={archived ? 'archived' : 'active'}
      options={sessionsFilterChoices}
      onValueChange={(value) => onArchivedChange(value === 'archived')}
      trigger={wide ? wideFilterTrigger : phoneFilterTrigger(archived)}
    />
  );
}
