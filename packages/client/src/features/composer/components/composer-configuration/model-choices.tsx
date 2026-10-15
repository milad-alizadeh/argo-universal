import { createElement, type ReactElement } from 'react';
import { configurationChoices } from '#lib/product/session-configuration';
import { Combobox, type ComboboxOption } from '#primitives/inputs/combobox';
import type { ConfigurationChoicesProps } from './configuration-types';
import { modelName, selection } from './configuration-values';

type Model = NonNullable<ReturnType<typeof selection>>;

export function ModelChoices(
  props: ConfigurationChoicesProps,
): ReactElement | null {
  const model = selection(props.configuration, 'model');

  if (!model) return null;

  return createElement(Combobox.Content<string>, {
    label: 'Models',
    value: model.currentValue,
    options: modelOptions(model),
    onValueChange: (value) =>
      props.configuration.onConfigChange(model.configId, value),
    onClose: props.onSelect,
  });
}

function modelOptions(model: Model): ComboboxOption<string>[] {
  return configurationChoices(model).map((choice) => ({
    value: choice.value,
    label: modelName(choice),
    accessibilityLabel: choice.name,
    supporting: choice.description,
  }));
}
