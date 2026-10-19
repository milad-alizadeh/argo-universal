import type { ReactElement } from 'react';
import { ConfigurationCombobox } from './configuration-combobox';
import type { ComposerConfigurationProps } from './configuration-types';
import { modelName, selection } from './configuration-values';

interface ModelPickerProps {
  configuration: ComposerConfigurationProps;
}

// The Model row: its models open beside Configure on a desktop and push the sheet's page on a phone.
export function ModelPicker(props: ModelPickerProps): ReactElement | null {
  const model = selection(props.configuration, 'model');

  if (!model) return null;

  return (
    <ConfigurationCombobox
      configuration={props.configuration}
      option={model}
      label="Model"
      title="Select Model"
      choiceLabel={modelName}
    />
  );
}
