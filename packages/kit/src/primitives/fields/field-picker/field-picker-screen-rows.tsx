import type { ReactElement } from 'react';
import { choosingPlace, ListPlaceContext, useListPlace } from '#kit/list-place';
import { AgentLogo } from '#primitives/content/agent-logo';
import { Icon, IconSlot } from '#primitives/content/icon';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import {
  optionSections,
  type FieldPickerOption,
  type OptionSection,
} from './field-picker-model';
import type { FieldPickerScreenProps } from './field-picker-screen';
import { change } from './field-picker-screen-choice';
import { EmptyState } from './field-picker-screen-parts';

type ListProps = Omit<
  React.ComponentProps<typeof List>,
  'items' | 'renderItem' | 'children'
>;

const maximumHeight = 320;

// The web page is a menu's plain rows that grow to fit.
const look = {
  fit: true,
  maxHeight: maximumHeight,
  appearance: 'plain',
  // The page frame holds the popover's one inset around the search, the rows and the action.
  padding: 0,
  paddingTop: 0,
  paddingBottom: 0,
} as const;

function listProps(props: FieldPickerScreenProps): Omit<ListProps, 'onMove'> {
  return {
    ...look,
    accessibilityRole: props.multiple ? 'list' : 'radiogroup',
    accessibilityLabel: props.title,
    drawDistance: Number.MAX_SAFE_INTEGER,
  };
}

// The options of a `page` as a menu's rows: the web, a desktop popover.
export function ScreenRows(props: FieldPickerScreenProps): ReactElement {
  return (
    <ListPlaceContext value={choosingPlace(useListPlace())}>
      <List {...listProps(props)} empty={<EmptyState {...props} />}>
        {optionSections(props.shown ?? props.options).map((section) => (
          <ChoiceSection key={section.key} {...props} section={section} />
        ))}
      </List>
    </ListPlaceContext>
  );
}

type SectionProps = FieldPickerScreenProps & { section: OptionSection };

function ChoiceSection(props: SectionProps): ReactElement {
  return (
    <List.Section
      title={props.section.title}
      selectionMode={props.multiple ? 'multiple' : 'single'}
      selection={props.held}
      onSelectionChange={(next) => change(props, next)}
    >
      {props.section.options.map((option) => (
        <ScreenRow key={option.value} {...props} option={option} />
      ))}
    </List.Section>
  );
}

function ScreenRow(
  props: FieldPickerScreenProps & { option: FieldPickerOption },
): ReactElement {
  return (
    <ListItem
      {...optionItemProps(props.option)}
      accessibilityRole={rowRole(props)}
    />
  );
}

const optionItemProps = (
  option: FieldPickerOption,
): React.ComponentProps<typeof ListItem> => ({
  id: option.value,
  title: option.label,
  subtitle: option.subtitle,
  leading: optionLeading(option),
  tone: option.tone,
  pending: option.pending,
  accessibilityLabel: option.label,
});

// A single choice is a radio; a multiple choice's rows take the role the List gives a toggled row.
const rowRole = (props: FieldPickerScreenProps): 'radio' | undefined =>
  props.multiple ? undefined : 'radio';

// A logo where the option has one, else its icon.
function optionLeading(option: FieldPickerOption): ReactElement | undefined {
  if (option.logo)
    return (
      <IconSlot size="md">
        <AgentLogo logo={option.logo} label={option.label} size="md" />
      </IconSlot>
    );

  return option.icon ? <Icon name={option.icon} size="md" /> : undefined;
}
