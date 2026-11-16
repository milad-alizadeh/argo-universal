import type { ReactElement } from 'react';
import { View } from 'react-native';
import { choosingPlace, ListPlaceContext, useListPlace } from '#kit/list-place';
import { AgentLogo } from '#primitives/content/agent-logo';
import { Avatar, initialsOf } from '#primitives/content/avatar';
import { Icon, IconSlot } from '#primitives/content/icon';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { createSection } from './field-picker-create';
import {
  optionSections,
  type FieldPickerOption,
  type OptionSection,
} from './field-picker-model';
import type { FieldPickerScreenProps } from './field-picker-screen';
import { change } from './field-picker-screen-choice';
import { screenEmpty } from './field-picker-screen-parts';

type ListProps = Omit<
  React.ComponentProps<typeof List>,
  'items' | 'renderItem' | 'children'
>;

const maximumHeight = 320;

// A tracker label's own colour, as a dot before its name.
function ColorDot({ color }: { color: string }): ReactElement {
  return (
    <IconSlot size="md">
      <View
        aria-hidden
        className="size-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    </IconSlot>
  );
}

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
      <List {...listProps(props)} empty={screenEmpty(props)}>
        {optionSections(props.shown ?? props.options).map((section) => (
          <ChoiceSection key={section.key} {...props} section={section} />
        ))}
        {createSection(props)}
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

// A person's avatar or a label's colour dot where the option has one, else its logo or icon.
const optionLeading = (option: FieldPickerOption): ReactElement | undefined =>
  option.avatar ? <PersonAvatar name={option.label} /> : colorOrLogo(option);

const colorOrLogo = (option: FieldPickerOption): ReactElement | undefined =>
  option.color ? <ColorDot color={option.color} /> : logoOrIcon(option);

function PersonAvatar({ name }: { name: string }): ReactElement {
  return (
    <Avatar
      size="sm"
      initials={initialsOf(name)}
      accessibilityLabel={name}
      decorative
    />
  );
}

// A logo where the option has one, else its icon.
function logoOrIcon(option: FieldPickerOption): ReactElement | undefined {
  if (option.logo)
    return (
      <IconSlot size="md">
        <AgentLogo logo={option.logo} label={option.label} size="md" />
      </IconSlot>
    );

  return option.icon ? <Icon name={option.icon} size="md" /> : undefined;
}
