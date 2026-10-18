import { createElement, useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import type { ComboboxContentProps, ComboboxOption } from './combobox-props';
import { ComboboxResults } from './combobox-results';
import { ComboboxSearch } from './combobox-search';

export function ComboboxContent<Value extends string>(
  props: ComboboxContentProps<Value>,
): ReactElement {
  const search = useSearch(props);
  const options = results(props, search.value);

  return createElement(ComboboxResults<Value>, {
    ...props,
    options,
    search: <Search {...search} />,
    message: <Status {...props} count={options.length} />,
    footer: <Footer action={props.footerAction} close={props.onClose} />,
  });
}

type SearchProps = {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
};

type SearchOwner = Pick<
  ComboboxContentProps<string>,
  'label' | 'searchPlaceholder'
>;

function useSearch(props: SearchOwner): SearchProps {
  const [value, onChangeText] = useState('');

  return {
    label: props.label,
    placeholder: props.searchPlaceholder,
    value,
    onChangeText,
  };
}

function Search(props: SearchProps): ReactElement {
  return (
    <View className="px-4 py-3 wide:p-0">
      <ComboboxSearch
        {...props}
        label={`Search ${props.label}`}
        placeholder={props.placeholder ?? 'Search'}
      />
    </View>
  );
}

function results<Value extends string>(
  props: ComboboxContentProps<Value>,
  query: string,
): ComboboxContentProps<Value>['options'] {
  if (props.loading) return [];

  if (props.loadError) return [];

  const filter = choiceFilter(props.filter);

  return props.options.filter((option) => filter(option, query));
}

function choiceFilter<Value extends string>(
  filter: ComboboxContentProps<Value>['filter'],
): NonNullable<ComboboxContentProps<Value>['filter']> {
  return filter ?? matches;
}

function matches(option: ComboboxOption<string>, query: string): boolean {
  return `${option.label} ${option.supporting ?? ''}`
    .toLocaleLowerCase()
    .includes(query.trim().toLocaleLowerCase());
}

type StatusProps = Pick<
  ComboboxContentProps<string>,
  'loading' | 'loadError' | 'emptyLabel'
> & { count: number };

function Status(props: StatusProps): ReactElement | null {
  const message = statusMessage(props);

  if (!message) return null;

  return (
    <Text
      accessibilityRole={props.loadError ? 'alert' : 'status'}
      role="secondary"
      className="px-4 py-3"
    >
      {message}
    </Text>
  );
}

function statusMessage(props: StatusProps): string | undefined {
  return loadingMessage(props) ?? emptyMessage(props);
}

function loadingMessage(props: StatusProps): string | undefined {
  return props.loading ? 'Loading options…' : props.loadError;
}

function emptyMessage(props: StatusProps): string | undefined {
  return props.count === 0
    ? (props.emptyLabel ?? 'No matching options')
    : undefined;
}

type FooterProps = {
  action: ComboboxContentProps<string>['footerAction'];
  close?: () => void;
};

function Footer({ action, close }: FooterProps): ReactElement | null {
  if (!action) return null;

  return (
    <Button
      variant="ghost"
      label={action.label}
      onPress={() => {
        close?.();
        action.onPress();
      }}
    />
  );
}
