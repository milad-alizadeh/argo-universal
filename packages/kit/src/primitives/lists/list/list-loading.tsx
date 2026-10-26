import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Spinner } from '#primitives/status/spinner';
import type { ListProps } from './list-props';
import { useListRefresh } from './list-refresh';
import { useListRequest, type ListRequest } from './list-request';

const failure = {
  title: "Couldn't load more",
  message: 'Scroll to the end to try again.',
};

function LoadingPage(): ReactElement {
  return (
    <View className="items-center py-4">
      <Spinner accessibilityLabel="Loading more" />
    </View>
  );
}

function loadingContent<Item>(
  props: ListProps<Item>,
  loading: boolean,
): Pick<ListProps<Item>, 'header' | 'endContent'> {
  if (!loading) return { header: props.header, endContent: props.endContent };

  return loadingAtEdge(props);
}

function loadingAtEdge<Item>(
  props: ListProps<Item>,
): Pick<ListProps<Item>, 'header' | 'endContent'> {
  return { header: loadingHeader(props), endContent: loadingFooter(props) };
}

function loadMore<Item>(props: ListProps<Item>, request: ListRequest): void {
  if (props.pagination?.hasMore) void request.run(props.pagination.onLoadMore);
}

function paginationEvents<Item>(
  props: ListProps<Item>,
  request: ListRequest,
): Pick<ListProps<Item>, 'onEndReached' | 'onStartReached'> {
  if (!props.pagination)
    return {
      onEndReached: props.onEndReached,
      onStartReached: props.onStartReached,
    };

  return props.anchor === 'end'
    ? startPagination(props, request)
    : endPagination(props, request);
}

function startPagination<Item>(
  props: ListProps<Item>,
  request: ListRequest,
): Pick<ListProps<Item>, 'onEndReached' | 'onStartReached'> {
  return {
    onEndReached: props.onEndReached,
    onStartReached: (info) => {
      props.onStartReached?.(info);
      loadMore(props, request);
    },
  };
}

function endPagination<Item>(
  props: ListProps<Item>,
  request: ListRequest,
): Pick<ListProps<Item>, 'onEndReached' | 'onStartReached'> {
  return {
    onStartReached: props.onStartReached,
    onEndReached: (info) => {
      props.onEndReached?.(info);
      loadMore(props, request);
    },
  };
}

export function useListLoading<Item>(props: ListProps<Item>): ListProps<Item> {
  const page = useListRequest(failure);
  const refreshControl = useListRefresh(props.onRefresh);

  return {
    ...props,
    refreshControl,
    ...loadingContent(props, page.loading),
    ...paginationEvents(props, page),
  };
}

function BeforeSpinner({ children }: { children: ReactNode }): ReactElement {
  return (
    <>
      <LoadingPage />
      {children}
    </>
  );
}

function AfterSpinner({ children }: { children: ReactNode }): ReactElement {
  return (
    <>
      {children}
      <LoadingPage />
    </>
  );
}

function loadingHeader<Item>(props: ListProps<Item>): ReactNode {
  return props.anchor === 'end' ? (
    <BeforeSpinner>{props.header}</BeforeSpinner>
  ) : (
    props.header
  );
}

function loadingFooter<Item>(props: ListProps<Item>): ReactNode {
  return props.anchor === 'end' ? (
    props.endContent
  ) : (
    <AfterSpinner>{props.endContent}</AfterSpinner>
  );
}
