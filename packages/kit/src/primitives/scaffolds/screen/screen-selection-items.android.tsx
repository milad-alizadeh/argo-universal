import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import type { SelectionBar } from '#kit/selection-mode';
import { splitHeaderActions } from '#primitives/actions/action';
import { ScreenActionButton } from './screen-action-button.android';
import { ToolbarActions } from './screen-toolbar-actions.android';

const selectedSlots = 3;

// Material's contextual bar: Close leads, the count is the title, the selected Actions trail.
export function SelectionItems({ bar }: { bar: SelectionBar }): ReactElement {
  const options = {
    headerLeft: (): ReactElement => <Close bar={bar} />,
    headerRight: (): ReactElement => <Selected bar={bar} />,
  };

  return <Stack.Screen options={options} />;
}

function Close({ bar }: { bar: SelectionBar }): ReactElement {
  const action = {
    id: 'close-selection',
    label: 'Close selection',
    icon: 'close',
    onPress: bar.onClose,
  } as const;

  return <ScreenActionButton action={action} />;
}

function Selected({ bar }: { bar: SelectionBar }): ReactElement {
  const split = splitHeaderActions(bar.groups, selectedSlots);
  const header = { ...split, label: 'More actions' };

  return <ToolbarActions header={header} />;
}
