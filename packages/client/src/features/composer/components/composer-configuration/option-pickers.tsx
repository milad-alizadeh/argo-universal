import type { ReactElement } from 'react';
import { configurationPicker } from './configuration-picker';
import type { ComposerConfigurationProps } from './configuration-types';
import { otherSelections } from './configuration-values';

interface OptionsProps {
  configuration: ComposerConfigurationProps;
}

// An Agent's other select options, such as a response style: each row opens its own choices. A call, so the section places each row.
export function optionPickers(props: OptionsProps): ReactElement[] {
  return otherSelections(props.configuration).map((option) =>
    configurationPicker({
      configuration: props.configuration,
      option,
      title: option.name,
    }),
  );
}
