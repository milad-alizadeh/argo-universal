import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Action, ActionList } from '#primitives/actions/action-list';
import { Text } from '#primitives/content/text';
import {
  SearchField,
  type SearchFieldProps,
} from '#primitives/inputs/search-field';
import type { PageProps } from './page-props';

type HeadingContent = { title: ReactNode; actions: ReactNode };

export function HeadingRow(props: PageProps): ReactElement {
  const content = {
    title: <PageTitle title={props.title} />,
    actions: <HeadingActions {...props} />,
  };

  if (props.search) return <SearchHeading {...content} search={props.search} />;

  return <PlainHeading {...content} />;
}

function PlainHeading(props: HeadingContent): ReactElement {
  return (
    <View className="h-10 flex-row items-center gap-1">
      <View className="min-w-0 flex-1">{props.title}</View>
      {props.actions}
    </View>
  );
}

function HeadingActions(
  props: Pick<PageProps, 'actions' | 'primaryAction'>,
): ReactElement {
  return (
    <>
      {props.actions}
      {primaryButton(props.primaryAction)}
    </>
  );
}

function PageTitle({ title }: Pick<PageProps, 'title'>): ReactElement {
  return (
    <Text role="title" accessibilityRole="heading" numberOfLines={1}>
      {title}
    </Text>
  );
}

function SearchHeading(
  props: HeadingContent & { search: NonNullable<PageProps['search']> },
): ReactElement {
  return (
    <View className="h-10 flex-row items-center">
      <SearchField
        {...searchQuery(props.search)}
        title={props.title}
        actions={props.actions}
      />
    </View>
  );
}

function searchQuery(
  search: NonNullable<PageProps['search']>,
): Pick<SearchFieldProps, 'label' | 'value' | 'onChangeText'> {
  return {
    label: search.label,
    value: search.value ?? '',
    onChangeText: search.onChangeText ?? ignoreSearch,
  };
}

function primaryButton(
  action: PageProps['primaryAction'],
): ReactElement | null {
  if (!action) return null;

  return (
    <ActionList>
      <Action {...action} />
    </ActionList>
  );
}

function ignoreSearch(): void {}
