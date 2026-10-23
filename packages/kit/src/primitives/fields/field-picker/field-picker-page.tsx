import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import {
  chosenValues,
  choose,
  matchingOptions,
  optionSections,
  type FieldPickerOption,
  type FieldPickerProps,
  type OptionSection,
} from './field-picker-model';
import { PageFrame } from './field-picker-page-frame';
import {
  EmptyState,
  PageFooter,
  PageSearch,
  PageStatus,
  pageStatus,
} from './field-picker-page-parts';

export type FieldPickerPageProps = FieldPickerProps & {
  // Called after a single choice, so the page it sits on can close.
  onClose?: () => void;
};

type PageState = FieldPickerPageProps & {
  query: string;
  onQueryChange: (query: string) => void;
  // A pushed page's header holds the search, so the page draws no field of its own.
  searchInHeader: boolean;
};

/*
 * The choices of a `page` presentation (ADR-0042), the same on every platform: the kit's shared search field when
 * `searchable`, the options in sections with a mark on the chosen ones, an empty state, and an action button in a
 * place of its own below. A single choice reports and closes; a `multiple` page stays open and reports each toggle.
 */
export function FieldPickerPage(props: PageState): ReactElement {
  const options = matchingOptions(props.options, props.query);

  return (
    <PageFrame search={searchOf(props)} footer={<PageFooter {...props} />}>
      <PageList {...props} options={options} />
    </PageFrame>
  );
}

function searchOf(props: PageState): ReactElement | null {
  if (!props.searchable || props.searchInHeader) return null;

  return (
    <PageSearch
      title={props.title}
      value={props.query}
      onChange={props.onQueryChange}
    />
  );
}

type ListProps = Omit<
  React.ComponentProps<typeof List>,
  'items' | 'renderItem' | 'children'
>;

const maximumHeight = 320;

// The web page is a menu's plain rows that grow to fit; a phone's is a list of cards that fills its page.
const looks = {
  web: {
    fit: true,
    maxHeight: maximumHeight,
    appearance: 'plain',
    // The page frame holds the popover's one inset around the search, the rows and the action.
    padding: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  native: { fit: false, maxHeight: undefined, appearance: 'cards' },
} as const;

function listProps(props: FieldPickerPageProps): ListProps {
  return {
    ...looks[Platform.OS === 'web' ? 'web' : 'native'],
    accessibilityRole: props.multiple ? 'list' : 'radiogroup',
    accessibilityLabel: props.title,
    drawDistance: Number.MAX_SAFE_INTEGER,
  };
}

function PageList(props: FieldPickerPageProps): ReactElement {
  return (
    <>
      <PageRows {...props} />
      <PageStatus {...pageStatus(props)} />
    </>
  );
}

function PageRows(props: FieldPickerPageProps): ReactElement {
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

function change(props: FieldPickerPageProps, next: readonly string[]): void {
  if (props.multiple) toggleChange(props, next);
  else pickChange(props, next);
}

// A single section reports the pressed value alone, even the chosen one, and a choice closes the page.
function pickChange(
  props: FieldPickerPageProps,
  next: readonly string[],
): void {
  const [pressed] = next;

  if (pressed === undefined) return;

  choose(props, pressed);
  props.onClose?.();
}

// A multiple section reports its whole selection toggled; the value that differs from the held one is the press.
function toggleChange(
  props: FieldPickerPageProps,
  next: readonly string[],
): void {
  const held = chosenValues(props);

  const pressed = [...next, ...held].find(
    (value) => next.includes(value) !== held.includes(value),
  );

  if (pressed !== undefined) choose(props, pressed);
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

// A web single choice is a radio; a multiple choice's rows take the role the List gives a toggled row.
function rowRole(props: FieldPickerPageProps): 'radio' | 'button' | undefined {
  if (Platform.OS !== 'web') return 'button';

  return props.multiple ? undefined : 'radio';
}
