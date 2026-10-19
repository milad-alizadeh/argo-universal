import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Action, ActionList } from '#primitives/actions/action-list';
import { Text } from '#primitives/content/text';
import {
  SearchField,
  type SearchFieldProps,
} from '#primitives/inputs/search-field';
import { PageColumn } from './page-column';
import type { PageProps } from './page-props';

// A wide Page's heading, or any Page's when no navigator draws its header.
export function PageHeadingBody(props: PageProps): ReactElement {
  return (
    <View className="py-6">
      <PageColumn>
        <HeadingRow {...props} />
      </PageColumn>
    </View>
  );
}

type HeadingContent = { title: ReactNode; actions: ReactNode };

export function HeadingRow(props: PageProps): ReactElement {
  const content = {
    title: <PageTitle title={props.title} />,
    actions: <HeadingActions {...props} />,
  };

  if (props.search) return <SearchHeading {...content} page={props} />;

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
  props: HeadingContent & { page: PageProps },
): ReactElement {
  return (
    <View className="h-10 flex-row items-center">
      <SearchField
        {...searchQuery(props.page)}
        title={props.title}
        actions={props.actions}
      />
    </View>
  );
}

function searchQuery(
  page: PageProps,
): Pick<
  SearchFieldProps,
  'label' | 'value' | 'onChangeText' | 'onFocus' | 'onBlur'
> {
  return {
    label: searchLabel(page),
    value: searchValue(page),
    onChangeText: page.onChangeText ?? ignoreSearch,
    onFocus: page.onFocus,
    onBlur: page.onBlur,
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

function searchLabel(page: PageProps): string {
  return page.search?.label ?? 'Search';
}

function searchValue(page: PageProps): string {
  return page.value ?? '';
}
