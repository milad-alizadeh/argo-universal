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
} from '#primitives/controls/search-field';
import { ScreenBack } from './screen-back';
import { ScreenColumn } from './screen-column';
import type { ScreenHeaderInput, ScreenProps } from './screen-props';

// A wide Screen's heading, or any Screen's when no navigator draws its header.
export function ScreenHeadingBody(props: ScreenHeaderInput): ReactElement {
  return (
    <View className="py-6">
      <ScreenColumn>
        <View className="gap-1">
          <HeadingRow {...props} />
          <ScreenCaption caption={props.caption} />
        </View>
      </ScreenColumn>
    </View>
  );
}

// A wide page's caption; a phone leaves it out, as its native header has no room for it.
function ScreenCaption({ caption }: Pick<ScreenProps, 'caption'>): ReactNode {
  const wide = useWide();

  if (!caption || !wide) return null;

  return (
    <Text role="body" tone="muted">
      {caption}
    </Text>
  );
}

type HeadingContent = { title: ReactNode; actions: ReactNode };

export function HeadingRow(props: ScreenHeaderInput): ReactElement {
  const content = {
    title: <ScreenTitle title={props.title} />,
    actions: <HeadingActions {...props} />,
  };

  return (
    <View>
      <ScreenBack onBack={props.onBack} />
      <Heading content={content} page={props} />
    </View>
  );
}

function Heading(props: {
  content: HeadingContent;
  page: ScreenProps;
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

// Every ActionList the Screen registered, its own and its content's, split as one header with one overflow menu.
function HeadingActions(
  props: Pick<ScreenHeaderInput, 'header' | 'primaryAction'>,
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

function ScreenTitle({ title }: Pick<ScreenProps, 'title'>): ReactElement {
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
  props: HeadingContent & { page: ScreenProps },
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
  page: ScreenProps,
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

function primaryButton(action: ScreenProps['primaryAction']): ReactNode {
  if (!action) return null;

  return <ActionList>{action}</ActionList>;
}

function ignoreSearch(): void {}

function searchLabel(page: ScreenProps): string {
  return page.search?.label ?? 'Search';
}

function searchValue(page: ScreenProps): string {
  return page.value ?? '';
}
