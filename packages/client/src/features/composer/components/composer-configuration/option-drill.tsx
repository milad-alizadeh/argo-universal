import type { ReactElement } from 'react';
import { ConfigurationCombobox } from './configuration-combobox';
import type { ComposerConfigurationProps } from './configuration-types';
import { otherSelections } from './configuration-values';

interface OptionsProps {
  configuration: ComposerConfigurationProps;
}

// An Agent's other select options, such as a response style: each row opens its own choices. A call, so the list places each row.
export function optionDrills(props: OptionsProps): ReactElement[] {
  return otherSelections(props.configuration).map((option) => (
    <ConfigurationCombobox
      key={option.configId}
      configuration={props.configuration}
      option={option}
      label={option.name}
      title={option.name}
    />
  ));
}
