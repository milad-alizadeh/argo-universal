import type { SessionConfigSelectOption } from '@repo/contracts';
import type * as React from 'react';
import { Platform } from 'react-native';
import { listTestIdProps } from '#lib/generic/list-test-id';
import { ScrollFadeList } from '#lib/product/scroll-fade/scroll-fade-list';
import { FieldGroup } from '#primitives/fields/field-group/field-group';
import { FieldSection } from '#primitives/fields/field-section/field-section';
import { FieldRowEnd } from '../../../../lib/generic/primitives/fields/field-layout';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { configurationChoices } from '../../state/configuration-choices';
import { ConfigurationChoice } from './configuration-choice';
import type { ComposerConfigurationProps } from './configuration-types';
import { modelName, selection } from './configuration-values';
const modelListMaxHeight = 320;

export function ModelChoices({
  configuration,
  onSelect,
  onContentHeightChange,
}: {
  configuration: ComposerConfigurationProps;
  onSelect: () => void;
  // A phone's sheet fits the choices.
  onContentHeightChange?: (height: number) => void;
}): React.JSX.Element | null {
  const wide = useWide() && Platform.OS === 'web';
  const model = selection(configuration, 'model');
  if (!model) return null;
  if (wide)
    return <ModelList configuration={configuration} onSelect={onSelect} />;
  return (
    <FieldGroup
      fit={Platform.OS === 'web'}
      onContentHeightChange={onContentHeightChange}
    >
      <FieldSection>
        {configurationChoices(model).map((choice) => (
          <ModelChoice
            key={choice.value}
            configuration={configuration}
            choice={choice}
            onSelect={onSelect}
          />
        ))}
      </FieldSection>
    </FieldGroup>
  );
}

// The desktop model list grows with its models up to a cap, then scrolls.
function ModelList({
  configuration,
  onSelect,
}: {
  configuration: ComposerConfigurationProps;
  onSelect: () => void;
}): React.JSX.Element | null {
  const model = selection(configuration, 'model');
  if (!model) return null;
  return (
    <FieldSection>
      <ScrollFadeList
        {...listTestIdProps('composer-models-scroll')}
        surfaceClassName="bg-sidebar"
        maxHeight={modelListMaxHeight}
        contentContainerStyle={{}}
        data={configurationChoices(model)}
        keyExtractor={(choice) => choice.value}
        renderItem={({ item: choice, index }) => (
          <FieldRowEnd value={index === configurationChoices(model).length - 1}>
            <ModelChoice
              configuration={configuration}
              choice={choice}
              onSelect={onSelect}
            />
          </FieldRowEnd>
        )}
        estimatedItemSize={60}

        extraData={configuration}
      />
    </FieldSection>
  );
}

function ModelChoice({
  configuration,
  choice,
  onSelect,
}: {
  configuration: ComposerConfigurationProps;
  choice: SessionConfigSelectOption;
  onSelect: () => void;
}): React.JSX.Element | null {
  const model = selection(configuration, 'model');
  if (!model) return null;
  return (
    <ConfigurationChoice
      selected={choice.value === model.currentValue}
      label={modelName(choice)}
      accessibilityLabel={choice.name}
      description={choice.description}
      onPress={() => {
        configuration.onConfigChange(model.configId, choice.value);
        onSelect();
      }}
    />
  );
}
