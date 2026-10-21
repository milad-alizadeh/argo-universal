import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { useWide } from '#kit/use-wide/use-wide';
import {
  ActionList,
  HeaderActions,
  headerSlots,
  type HeaderActionsProps,
} from '#primitives/actions/action-list';
import { Text } from '#primitives/content/text';
import {
  SearchField,
  type SearchFieldProps,
} from '#primitives/inputs/search-field';
import { PageBack } from './page-back';
import { PageColumn } from './page-column';
import type { PageHeaderInput, PageProps } from './page-props';

// A wide Page's heading, or any Page's when no navigator draws its header.
export function PageHeadingBody(props: PageHeaderInput): ReactElement {
  return (
    <View className="py-6">
      <PageColumn>
        <View className="gap-1">
          <HeadingRow {...props} />
          <PageCaption caption={props.caption} />
        </View>
      </PageColumn>
    </View>
  );
}

// A wide page's caption; a phone leaves it out, as its native header has no room for it.
function PageCaption({ caption }: Pick<PageProps, 'caption'>): ReactNode {
  const wide = useWide();

  if (!caption || !wide) return null;

  return (
    <Text role="body" tone="muted">
      {caption}
    </Text>
  );
}

type HeadingContent = { title: ReactNode; actions: ReactNode };

export function HeadingRow(props: PageHeaderInput): ReactElement {
  const content = {
    title: <PageTitle title={props.title} />,
    actions: <HeadingActions {...props} />,
  };

  return (
    <View>
      <PageBack onBack={props.onBack} />
      <Heading content={content} page={props} />
    </View>
  );
}

function Heading(props: {
  content: HeadingContent;
  page: PageProps;
}): ReactElement {
  if (props.page.search)
    return <SearchHeading {...props.content} page={props.page} />;

  return <PlainHeading {...props.content} />;
}

function PlainHeading(props: HeadingContent): ReactElement {
  return (
    <View className="h-10 flex-row items-center gap-1">
      <View className="min-w-0 flex-1">{props.title}</View>
      {props.actions}
    </View>
  );
}

// Every ActionList the Page registered, its own and its content's, split as one header with one overflow menu.
function HeadingActions(
  props: Pick<PageHeaderInput, 'header' | 'primaryAction'>,
): ReactElement {
  const { groups, label } = props.header;

  return (
    <>
      <DeclaredActions groups={groups} label={label} />
      {primaryButton(props.primaryAction)}
    </>
  );
}

function DeclaredActions(
  props: Omit<HeaderActionsProps, 'slots'>,
): ReactElement | null {
  if (!props.groups.length) return null;

  return <HeaderActions {...props} slots={headerSlots} />;
}

function PageTitle({ title }: Pick<PageProps, 'title'>): ReactElement {
  return (
    <Text
      role="title"
      accessibilityRole="heading"
      aria-level={1}
      numberOfLines={1}
    >
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

function primaryButton(action: PageProps['primaryAction']): ReactNode {
  if (!action) return null;

  return <ActionList>{action}</ActionList>;
}

function ignoreSearch(): void {}

function searchLabel(page: PageProps): string {
  return page.search?.label ?? 'Search';
}

function searchValue(page: PageProps): string {
  return page.value ?? '';
}
