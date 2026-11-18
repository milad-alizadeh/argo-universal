import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Spinner } from '#primitives/status/spinner';
import { useListLook } from '../../../list-look-context';
import { drawsNativeGroupedList } from './list-native-rows';
import { ListPageFailure } from './list-page-failure';
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
  request: ListRequest,
): Pick<ListProps<Item>, 'startContent' | 'endContent'> {
  const edge = pageEdge(props.pagination, request);

  const { startContent, endContent } = props;

  if (edge === null) return { startContent, endContent };

  return props.anchor === 'end'
    ? { startContent: joinEdge(edge, startContent), endContent }
    : { startContent, endContent: joinEdge(endContent, edge) };
}

const joinEdge = (first: ReactNode, second: ReactNode): ReactNode => (
  <>
    {first}
    {second}
  </>
);

function pageEdge<Item>(
  pagination: ListProps<Item>['pagination'],
  request: ListRequest,
): ReactNode {
  if (request.loading) return <LoadingPage />;

  return pagination ? failedPage(pagination, request) : null;
}

function failedPage<Item>(
  pagination: NonNullable<ListProps<Item>['pagination']>,
  request: ListRequest,
): ReactNode {
  if (pagination.failed === undefined) return null;

  return (
    <ListPageFailure
      reason={pagination.failed}
      retry={() => void request.run(pagination.onLoadMore)}
    />
  );
}

function loadMore<Item>(props: ListProps<Item>, request: ListRequest): void {
  if (props.pagination?.hasMore) void request.run(props.pagination.onLoadMore);
}

const autoPagination = <Item,>(
  pagination: ListProps<Item>['pagination'],
): boolean => pagination !== undefined && pagination.failed === undefined;

function paginationEvents<Item>(
  props: ListProps<Item>,
  request: ListRequest,
): Pick<ListProps<Item>, 'onEndReached' | 'onStartReached'> {
  if (!autoPagination(props.pagination))
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
  const native = drawsNativeGroupedList(useListLook(), props);
  const refreshControl = useListRefresh(native ? undefined : props.onRefresh);

  return {
    ...props,
    refreshControl: refreshControl ?? props.refreshControl,
    ...loadingContent(props, page),
    ...paginationEvents(props, page),
  };
}
