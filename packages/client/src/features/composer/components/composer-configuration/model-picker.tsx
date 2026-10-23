import type { ReactElement } from 'react';
import { configurationPicker } from './configuration-picker';
import type { ComposerConfigurationProps } from './configuration-types';
import { modelName, selection } from './configuration-values';

interface ModelPickerProps {
  configuration: ComposerConfigurationProps;
}

// The Model row, a call so a Section reads the picker itself: its models open beside Configure on a desktop and push the sheet's page on a phone.
export function modelPicker(props: ModelPickerProps): ReactElement | null {
  const model = selection(props.configuration, 'model');

  if (!model) return null;

  return configurationPicker({
    configuration: props.configuration,
    option: model,
    title: 'Model',
    leading: 'code-map',
    choiceLabel: modelName,
  });
}
