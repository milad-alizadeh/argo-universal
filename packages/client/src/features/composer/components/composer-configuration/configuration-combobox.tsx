import type { SessionConfigSelectOption } from '@repo/contracts';
import type { ReactElement } from 'react';
import { configurationChoices } from '#lib/product/session-configuration';
import {
  Combobox,
  type ComboboxOption,
  type ComboboxProps,
} from '#primitives/inputs/combobox';
import type { ComposerConfigurationProps } from './configuration-types';
import type { SelectConfiguration } from './configuration-values';

interface ConfigurationComboboxProps {
  configuration: ComposerConfigurationProps;
  option: SelectConfiguration;
  label: string;
  title: string;
  choiceLabel?: (choice: SessionConfigSelectOption) => string;
}

// A Configure row for one select option: on a desktop its choices open beside the menu, with no search, and stay open across picks; a phone pushes a page.
export function ConfigurationCombobox(
  props: ConfigurationComboboxProps,
): ReactElement {
  return <Combobox<string> {...comboboxProps(props)} />;
}

// Paper's Configure: picks keep the menu open and the choices have no search.
const configureRow = {
  variant: 'row',
  keepOpen: true,
  searchable: false,
} as const;

function comboboxProps(
  props: ConfigurationComboboxProps,
): ComboboxProps<string> {
  const { configuration, option, label, title } = props;

  return {
    ...configureRow,
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
