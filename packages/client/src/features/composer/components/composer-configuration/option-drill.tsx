import type { ReactElement } from 'react';
import { currentConfigurationChoice } from '#lib/product/session-configuration';
import { Drill } from '#primitives/overlays/drill';
import { ConfigurationChoices } from './configuration-choices';
import type { ComposerConfigurationProps } from './configuration-types';
import {
  otherSelections,
  type SelectConfiguration,
} from './configuration-values';

interface OptionsProps {
  configuration: ComposerConfigurationProps;
}

// An Agent's other select options, such as a response style: each row opens its own choices. A call, so the list places each row.
export function optionDrills(props: OptionsProps): ReactElement[] {
  return otherSelections(props.configuration).map((option) => (
    <OptionDrill key={option.configId} {...props} option={option} />
  ));
}

type DrillProps = OptionsProps & { option: SelectConfiguration };

function OptionDrill(props: DrillProps): ReactElement {
  const { name } = props.option;
  const value = currentConfigurationChoice(props.option)?.name;

  return (
    <Drill label={name} title={name} value={value} contentScrolls keepOpen>
      {(close) => (
        <ConfigurationChoices {...props} label={name} close={close} />
      )}
    </Drill>
  );
}
