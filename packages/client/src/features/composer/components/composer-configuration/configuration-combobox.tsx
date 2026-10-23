import type { SessionConfigSelectOption } from '@repo/contracts';
import {
  Combobox,
  type ComboboxOption,
  type ComboboxProps,
} from '@repo/kit/primitives/controls/combobox';
import type { ReactElement } from 'react';
import { configurationChoices } from '#lib/product/session-configuration';
import type { ComposerConfigurationProps } from './configuration-types';
import type { SelectConfiguration } from './configuration-values';

interface ConfigurationComboboxProps {
  configuration: ComposerConfigurationProps;
  option: SelectConfiguration;
  label: string;
  title: string;
  leading?: ReactElement;
  choiceLabel?: (choice: SessionConfigSelectOption) => string;
  // The choices are drawn with Configure rather than when the row is pressed; see Drill's mount.
  eager?: boolean;
}

// A Configure row for one select option, its short list of choices with no search: on a desktop they open beside the menu and stay open across picks; a phone pushes a page.
export function ConfigurationCombobox(
  props: ConfigurationComboboxProps,
): ReactElement {
  return <Combobox<string> {...comboboxProps(props)} />;
}

// Paper's Configure: picks keep the menu open, and no platform searches the choices.
const configureRow = {
  variant: 'row',
  keepOpen: true,
  searchable: false,
} as const;

type RowDrawing = typeof configureRow &
  Pick<ComboboxProps<string>, 'mount' | 'valueLeading'>;

// An eager row's choices are drawn with Configure itself, so pressing it only slides to them.
const rowDrawing = (props: ConfigurationComboboxProps): RowDrawing => ({
  ...configureRow,
  mount: props.eager ? 'eager' : 'lazy',
  valueLeading: props.leading,
});

function comboboxProps(
  props: ConfigurationComboboxProps,
): ComboboxProps<string> {
  const { configuration, option, label, title } = props;

  return {
    ...rowDrawing(props),
    label,
    title,
    value: option.currentValue,
    options: choiceOptions(props),
    onValueChange: (value) =>
      configuration.onConfigChange(option.configId, value),
  };
}

function choiceOptions(
  props: ConfigurationComboboxProps,
): ComboboxOption<string>[] {
  return configurationChoices(props.option).map((choice) => ({
    value: choice.value,
    label: props.choiceLabel?.(choice) ?? choice.name,
    accessibilityLabel: choice.name,
    subtitle: choice.description,
  }));
}
