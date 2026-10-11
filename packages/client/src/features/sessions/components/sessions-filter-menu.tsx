import type * as React from 'react';
import { HeaderButton } from '#lib/product/header-button';
import { IconButton } from '../../../lib/generic/primitives/icon-button';
import { Menu } from '../../../lib/generic/primitives/menu';
import { useWide } from '../../../lib/generic/use-wide';

const sessionsFilterChoices = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
] as const;

export interface SessionsFilterMenuProps {
  archived: boolean;
  onArchivedChange: (archived: boolean) => void;
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
      choices={sessionsFilterChoices}
      onValueChange={(value) => onArchivedChange(value === 'archived')}
      trigger={
        wide ? (
          <IconButton
            variant="ghost"
            className="size-8 sm:size-8"
            icon={'filters'}
            iconClassName={'text-muted-foreground'}
            accessibilityLabel="Filter Sessions"
            size="md"
          />
        ) : (
          <HeaderButton
            icon="filters"
            paired
            dot={archived ? 'filter' : undefined}
            accessibilityLabel="Filter Sessions"
          />
        )
      }
    />
  );
}
