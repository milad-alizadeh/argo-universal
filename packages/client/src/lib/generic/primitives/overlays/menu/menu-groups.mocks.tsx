import type * as React from 'react';
import { useState } from 'react';
import { Menu } from './menu';
import type { MenuChoiceGroup } from './menu-props';
import { MenuTrigger } from './menu-trigger';

const sortChoices = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
] as const;

const densityChoices = [
  { value: 'regular', label: 'Regular' },
  { value: 'compact', label: 'Compact' },
] as const;

type ViewOptions = { sort: string; density: string };

const defaultViewOptions: ViewOptions = { sort: 'newest', density: 'regular' };

type SetViewOptions = (view: ViewOptions) => void;

const viewGroup = (
  view: ViewOptions,
  setView: SetViewOptions,
  key: keyof ViewOptions,
): Omit<MenuChoiceGroup, 'label' | 'options'> => ({
  value: view[key],
  onValueChange: (value) => setView({ ...view, [key]: value }),
});

const viewOptionGroups = (
  view: ViewOptions,
  setView: SetViewOptions,
): MenuChoiceGroup[] => [
  {
    label: 'Order by',
    options: sortChoices,
    ...viewGroup(view, setView, 'sort'),
  },
  {
    label: 'Layout',
    options: densityChoices,
    ...viewGroup(view, setView, 'density'),
  },
];

// Two headed groups.
export function ViewOptionsMenu(): React.JSX.Element {
  const [view, setView] = useState(defaultViewOptions);

  return (
    <Menu
      accessibilityLabel="View options"
      trigger={<MenuTrigger label="View" icon="filters" />}
      groups={viewOptionGroups(view, setView)}
    />
  );
}
