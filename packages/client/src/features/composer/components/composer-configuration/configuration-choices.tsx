import type { SessionConfigSelectOption } from '@repo/contracts';
import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { configurationChoices } from '#lib/product/session-configuration';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import type { ComposerConfigurationProps } from './configuration-types';
import type { SelectConfiguration } from './configuration-values';

interface ChoicesProps {
  configuration: ComposerConfigurationProps;
  option: SelectConfiguration;
  // The list's accessible name.
  label: string;
  // Called after a pick; a drill that keeps its choices open ignores it.
  close: () => void;
  choiceTitle?: (choice: SessionConfigSelectOption) => string;
}

// As the Combobox's choices: a long list scrolls inside a popover that stays within the window.
const webMaximumHeight = 320;

// One select option's choices, the current one checked: Configure's drilled rows open these.
export function ConfigurationChoices(props: ChoicesProps): ReactElement {
  return <List {...listProps(props.label)}>{choicesSection(props)}</List>;
}

type ChoiceListProps = Omit<
  React.ComponentProps<typeof List>,
  'items' | 'renderItem' | 'children'
>;

function listProps(label: string): ChoiceListProps {
  return {
    appearance: 'grouped',
    fit: true,
    maxHeight: Platform.OS === 'web' ? webMaximumHeight : undefined,
    accessibilityRole: 'radiogroup',
    accessibilityLabel: label,
  };
}

// A call, as List reads its sections from its direct children.
function choicesSection(props: ChoicesProps): ReactElement {
  return (
    <List.Section
      selectionMode="single"
      selection={[props.option.currentValue]}
      onSelectionChange={([value]) => choose(props, value)}
    >
      {configurationChoices(props.option).map((choice) => (
        <ListItem key={choice.value} {...choiceRow(props, choice)} />
      ))}
    </List.Section>
  );
}

function choose(props: ChoicesProps, value: string | undefined): void {
  if (value === undefined) return;

  props.configuration.onConfigChange(props.option.configId, value);
  props.close();
}

function choiceRow(
  props: ChoicesProps,
  choice: SessionConfigSelectOption,
): React.ComponentProps<typeof ListItem> {
  return {
    id: choice.value,
    title: props.choiceTitle?.(choice) ?? choice.name,
    subtitle: choice.description,
    accessibilityLabel: choice.name,
    accessibilityRole: 'radio',
  };
}
