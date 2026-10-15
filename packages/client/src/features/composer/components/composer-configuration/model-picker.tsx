import type { ReactElement } from 'react';
import { configurationChoices } from '#lib/product/session-configuration';
import {
  Combobox,
  type ComboboxOption,
  type ComboboxProps,
} from '#primitives/inputs/combobox';
import type { ComposerConfigurationProps } from './configuration-types';
import { modelName, selection } from './configuration-values';

type Model = NonNullable<ReturnType<typeof selection>>;

interface ModelPickerProps {
  configuration: ComposerConfigurationProps;
}

// The Model row: a Combobox row that opens beside the menu on a desktop and pushes the sheet's page on a phone.
export function ModelPicker(props: ModelPickerProps): ReactElement | null {
  const model = selection(props.configuration, 'model');

  if (!model) return null;

  return <Combobox<string> {...modelPickerProps(props, model)} />;
}

function modelPickerProps(
  props: ModelPickerProps,
  model: Model,
): ComboboxProps<string> {
  return {
    variant: 'row',
    label: 'Model',
    title: 'Select Model',
    value: model.currentValue,
    options: modelOptions(model),
    onValueChange: (value) =>
      props.configuration.onConfigChange(model.configId, value),
  };
}

function modelOptions(model: Model): ComboboxOption<string>[] {
  return configurationChoices(model).map((choice) => ({
    value: choice.value,
    label: modelName(choice),
    accessibilityLabel: choice.name,
    supporting: choice.description,
  }));
}
