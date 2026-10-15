import type * as React from 'react';
import { createElement, useState } from 'react';
import {
  Platform,
  View,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groupedBackground } from '#primitives/native/grouped-background';
import { cn } from '../../../utils';
import { ComboboxSearch } from './combobox-search';
import { PickerOptionList } from './picker-option-list';
import type { ComboboxProps, PickerOption } from './picker-props';

export type ComboboxContentProps<Value extends string> = Omit<
  ComboboxProps<Value>,
  'onValueChange' | 'trigger'
> & {
  wide: boolean;
  // The sheet hugs the content, which takes its options' height up to the screen's.
  fit?: boolean;
  // Commits a choice; the overlay around it closes.
  onChoose: (value: Value) => void;
  // A story's starting query.
  initialQuery?: string;
};

// By default an option matches when its label or supporting line contains the query.
function matchesOption<Value extends string>(
  option: PickerOption<Value>,
  query: string,
): boolean {
  const search = query.trim().toLocaleLowerCase();

  return [option.label, option.supporting ?? ''].some((text) =>
    text.toLocaleLowerCase().includes(search),
  );
}

type Search<Value extends string> = {
  query: string;
  setQuery: (query: string) => void;
  found: readonly PickerOption<Value>[];
  // The first match a query leaves, which Enter chooses.
  active?: PickerOption<Value>;
};

function useSearch<Value extends string>(
  props: ComboboxContentProps<Value>,
): Search<Value> {
  const [query, setQuery] = useState(props.initialQuery ?? '');
  const found = matchingOptions(props, query);

  return { query, setQuery, found, active: firstMatch(found, query) };
}

function matchingOptions<Value extends string>(
  props: ComboboxContentProps<Value>,
  query: string,
): readonly PickerOption<Value>[] {
  if (!query) return props.options;
  const filter = props.filter ?? matchesOption;

  return props.options.filter((option) => filter(option, query));
}

function firstMatch<Value extends string>(
  found: readonly PickerOption<Value>[],
  query: string,
): PickerOption<Value> | undefined {
  if (!query) return undefined;

  return found.find((option) => !option.disabled);
}

// The search field over the options it filters, on a popover or a sheet.
export function ComboboxContent<Value extends string>(
  props: ComboboxContentProps<Value>,
): React.JSX.Element {
  const search = useSearch(props);
  const style = useContentStyle(props);

  return createElement(
    View,
    { className: contentClassName(props), style },
    <ComboboxSearch {...searchProps(props, search)} />,
    <PickerOptionList {...optionListProps(props, search)} />,
  );
}

function optionListProps<Value extends string>(
  props: ComboboxContentProps<Value>,
  search: Search<Value>,
): React.ComponentProps<typeof PickerOptionList<Value>> {
  return {
    ...props,
    options: search.found,
    activeValue: search.active?.value,
    onChoose: (option) => props.onChoose(option.value),
  };
}

function searchProps<Value extends string>(
  props: ComboboxContentProps<Value>,
  search: Search<Value>,
): React.ComponentProps<typeof ComboboxSearch> {
  const { active } = search;

  return {
    ...searchField(props),
    value: search.query,
    onChangeText: search.setQuery,
    onSubmit: () => {
      if (active) props.onChoose(active.value);
    },
  };
}

function searchField<Value extends string>(
  props: ComboboxContentProps<Value>,
): Pick<
  React.ComponentProps<typeof ComboboxSearch>,
  'label' | 'phone' | 'placeholder'
> {
  return {
    label: `Search ${props.label}`,
    phone: !props.wide,
    placeholder: props.searchPlaceholder ?? 'Search',
  };
}

// A phone's search and options sit on the stock grey of the grouped cards under it.
function useContentStyle(
  props: Pick<ComboboxContentProps<string>, 'wide' | 'fit'>,
): ViewStyle | undefined {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();

  if (props.wide) return undefined;

  return {
    backgroundColor: groupedBackground,
    maxHeight: fitHeight(props.fit, window.height - insets.top - insets.bottom),
  };
}

const fitHeight = (
  fit: boolean | undefined,
  screen: number,
): number | undefined => (fit ? screen : undefined);

const contentClassName = (
  props: Pick<ComboboxContentProps<string>, 'wide' | 'fit'>,
): string =>
  cn('gap-2', props.wide ? 'bg-content p-2' : 'pt-2 pb-4', {
    'flex-1': fillsSheet(props),
  });

// A phone sheet's content fills it, unless the sheet hugs the content.
const fillsSheet = (
  props: Pick<ComboboxContentProps<string>, 'wide' | 'fit'>,
): boolean => Platform.OS !== 'web' && !(props.wide || props.fit);
