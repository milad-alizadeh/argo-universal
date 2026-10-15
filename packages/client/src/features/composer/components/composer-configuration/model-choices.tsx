import type { SessionConfigSelectOption } from '@repo/contracts';
import type * as React from 'react';
import { Platform } from 'react-native';
import { listTestIdProps } from '#lib/generic/list-test-id';
import { ScrollFadeList } from '#lib/product/scroll-fade/scroll-fade-list';
import { configurationChoices } from '#lib/product/session-configuration';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItemEnd } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { ConfigurationChoice } from './configuration-choice';
import type { ConfigurationChoicesProps as ModelChoicesProps } from './configuration-types';
import { modelName, selection } from './configuration-values';

interface ModelChoiceProps extends ModelChoicesProps {
  choice: SessionConfigSelectOption;
}

const modelListMaxHeight = 320;

export function ModelChoices(
  props: ModelChoicesProps,
): React.JSX.Element | null {
  const wide = useWide();
  const model = selection(props.configuration, 'model');

  if (!model) return null;

  return <ModelChoicesLayout {...props} wide={wide} />;
}

function ModelChoicesLayout(
  props: ModelChoicesProps & { wide: boolean },
): React.JSX.Element {
  return props.wide && Platform.OS === 'web' ? (
    <ModelList {...props} />
  ) : (
    <GroupedModelChoices {...props} />
  );
}

function GroupedModelChoices(props: ModelChoicesProps): React.JSX.Element {
  const choices = configurationChoices(selection(props.configuration, 'model'));

  return (
    <GroupedList
      fit={Platform.OS === 'web'}
      onContentHeightChange={props.onContentHeightChange}
    >
      <GroupedListSection>
        {choices.map((choice) => (
          <ModelChoice key={choice.value} choice={choice} {...props} />
        ))}
      </GroupedListSection>
    </GroupedList>
  );
}

function ModelList(props: ModelChoicesProps): React.JSX.Element {
  return (
    <GroupedListSection>
      <ScrollFadeList {...modelListProps(props)} />
    </GroupedListSection>
  );
}

const modelListPresentation = {
  ...listTestIdProps('composer-models-scroll'),
  maxHeight: modelListMaxHeight,
  contentContainerStyle: {},
  estimatedItemSize: 60,
};

function modelListProps(
  props: ModelChoicesProps,
): React.ComponentProps<typeof ScrollFadeList<SessionConfigSelectOption>> {
  const choices = configurationChoices(selection(props.configuration, 'model'));

  return {
    ...modelListPresentation,
    data: choices,
    keyExtractor: (choice) => choice.value,
    renderItem: modelListRenderer(props, choices.length),
    extraData: props.configuration,
  };
}

function modelListRenderer(
  props: ModelChoicesProps,
  count: number,
): NonNullable<
  React.ComponentProps<
    typeof ScrollFadeList<SessionConfigSelectOption>
  >['renderItem']
> {
  return ({ item, index }) => (
    <ModelListRow {...props} choice={item} last={index === count - 1} />
  );
}

function ModelListRow(
  props: ModelChoiceProps & { last: boolean },
): React.JSX.Element {
  return (
    <GroupedListItemEnd value={props.last}>
      <ModelChoice {...props} />
    </GroupedListItemEnd>
  );
}

function ModelChoice(props: ModelChoiceProps): React.JSX.Element | null {
  const model = selection(props.configuration, 'model');

  if (!model) return null;

  return <ConfigurationChoice {...modelChoiceProps(props, model)} />;
}

function modelChoiceProps(
  { configuration, choice, onSelect }: ModelChoiceProps,
  model: NonNullable<ReturnType<typeof selection>>,
): React.ComponentProps<typeof ConfigurationChoice> {
  return {
    selected: choice.value === model.currentValue,
    label: modelName(choice),
    accessibilityLabel: choice.name,
    description: choice.description,
    onPress: () => {
      configuration.onConfigChange(model.configId, choice.value);
      onSelect();
    },
  };
}
