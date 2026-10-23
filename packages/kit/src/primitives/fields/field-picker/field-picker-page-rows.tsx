import type { ReactElement } from 'react';
import { InChoiceMenu } from '#kit/menu-rows-context';
import { Icon } from '#primitives/content/icon';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import {
  chosenValues,
  optionSections,
  type FieldPickerOption,
  type OptionSection,
} from './field-picker-model';
import type { FieldPickerPageProps } from './field-picker-page';
import { change } from './field-picker-page-choice';
import { EmptyState } from './field-picker-page-parts';

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

function listProps(props: FieldPickerPageProps): ListProps {
  return {
    ...look,
    accessibilityRole: props.multiple ? 'list' : 'radiogroup',
    accessibilityLabel: props.title,
    drawDistance: Number.MAX_SAFE_INTEGER,
  };
}

// The options of a `page` as a menu's rows: the web, a desktop popover.
export function PageRows(props: FieldPickerPageProps): ReactElement {
  return (
    <List {...listProps(props)} empty={<EmptyState />}>
      {optionSections(props.options).map((section) => (
        <PageSection key={section.title ?? ''} {...props} section={section} />
      ))}
    </List>
  );
}

type SectionProps = FieldPickerPageProps & { section: OptionSection };

function PageSection(props: SectionProps): ReactElement {
  return (
    <InChoiceMenu value>
      <ChoiceSection {...props} />
    </InChoiceMenu>
  );
}

function ChoiceSection(props: SectionProps): ReactElement {
  return (
    <List.Section
      title={props.section.title}
      selectionMode={props.multiple ? 'multiple' : 'single'}
      selection={chosenValues(props)}
      onSelectionChange={(next) => change(props, next)}
    >
      {props.section.options.map((option) => (
        <PageRow key={option.value} {...props} option={option} />
      ))}
    </List.Section>
  );
}

function PageRow(
  props: FieldPickerPageProps & { option: FieldPickerOption },
): ReactElement {
  const { option } = props;

  return (
    <ListItem
      id={option.value}
      title={option.label}
      subtitle={option.subtitle}
      leading={option.icon ? <Icon name={option.icon} size="md" /> : undefined}
      accessibilityLabel={option.label}
      accessibilityRole={rowRole(props)}
    />
  );
}

// A single choice is a radio; a multiple choice's rows take the role the List gives a toggled row.
const rowRole = (props: FieldPickerPageProps): 'radio' | undefined =>
  props.multiple ? undefined : 'radio';
