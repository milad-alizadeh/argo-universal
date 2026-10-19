import type { ReactElement } from 'react';
import { configurationChoices } from '#lib/product/session-configuration';
import { Combobox, type ComboboxOption } from '#primitives/inputs/combobox';
import { Drill, useDrillBeside } from '#primitives/overlays/drill';
import { ConfigurationChoices } from './configuration-choices';
import type { ComposerConfigurationProps } from './configuration-types';
import {
  modelName,
  selectedChoice,
  selection,
  type SelectConfiguration,
} from './configuration-values';

interface ModelPickerProps {
  configuration: ComposerConfigurationProps;
}

type ModelProps = ModelPickerProps & { model: SelectConfiguration };

const modelLabel = 'Model';

const modelTitle = 'Select Model';

// The Model row: on a desktop its models open beside Configure and stay open across picks; a phone pushes a searchable page.
export function ModelPicker(props: ModelPickerProps): ReactElement | null {
  const model = selection(props.configuration, 'model');

  if (!model) return null;

  return (
    <Drill
      label={modelLabel}
      title={modelTitle}
      value={modelName(selectedChoice(props.configuration, 'model'))}
      contentScrolls
      keepOpen
    >
      {(close) => <ModelChoices {...props} model={model} close={close} />}
    </Drill>
  );
}

type ChoicesProps = ModelProps & { close: () => void };

// Paper's drilled row has no search; a phone's page keeps its search field.
function ModelChoices(props: ChoicesProps): ReactElement {
  return useDrillBeside() ? (
    <ConfigurationChoices
      configuration={props.configuration}
      option={props.model}
      label={modelLabel}
      close={props.close}
      choiceTitle={modelName}
    />
  ) : (
    <SearchableModels {...props} />
  );
}

function SearchableModels(props: ChoicesProps): ReactElement {
  return (
    <Combobox.Content
      label={modelLabel}
      value={props.model.currentValue}
      options={modelOptions(props.model)}
      onValueChange={(value) =>
        props.configuration.onConfigChange(props.model.configId, value)
      }
      onClose={props.close}
    />
  );
}

function modelOptions(model: SelectConfiguration): ComboboxOption<string>[] {
  return configurationChoices(model).map((choice) => ({
    value: choice.value,
    label: modelName(choice),
    accessibilityLabel: choice.name,
    subtitle: choice.description,
  }));
}
