import {
  EmptyState,
  List,
  ListDetail,
  Screen,
  type Argo,
  type LoaderPage,
  type PagedList,
  type PageTo,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import {
  filterState,
  filterTargets,
  listFilter,
  loadFilter,
  noIssuesBecause,
  type FilterData,
  type FilterState,
} from './filter-loader';
import { issueRow } from './filter-rows';
import type { Issue } from './github-issues';
import { repositoryText } from './issue-client';
import type { IssueDeps } from './issue-deps';
import { filterPattern } from './issue-paths';
import { RootRows } from './issue-root';
import { issueTree } from './issue-tree';
import { loadingIssues } from './loading-issues';

type To = PageTo<FilterState>;

/*
 * One Project's filter list (ADR-0050): the Loader reads the Projects and the overview while the kit reads
 * the pages of Issues the App shows; the Render draws the sidebar beside them. The search narrows the Issues
 * once typing pauses, load more appends the next page, a pull starts again from the first, and a row's
 * Action closes or reopens its Issue as an Operation.
 */
export function defineFilterPage(argo: Argo, deps: IssueDeps): void {
  // A status change on any page, the Issue page's own included, leaves the counts and drawn lists stale.
  deps.changes.subscribe(() => argo.changed());
  argo.pages.define(filterPattern, filterPage(deps));
}

function filterPage(
  deps: IssueDeps,
): LoaderPage<FilterState, FilterData, Issue> {
  const targetOf = filterTargets(deps);

  return {
    state: filterState,
    load: (input) => loadFilter(deps, input.read, targetOf(input)),
    list: (input, cursor) =>
      listFilter(targetOf(input), input.state.query, cursor),
    render: (data, to, { state, list }) => (
      <FilterPage {...{ data, to, list }} query={state.query} />
    ),
  };
}

type PageProps = {
  data: FilterData;
  to: To;
  query: string;
  list: PagedList<Issue>;
};

function FilterPage(props: PageProps): JSX.Element {
  return (
    <ListDetail
      title="Issues"
      list={sidebar(props)}
      detail={filterDetail(props)}
      empty={<EmptyState title={noIssuesBecause(props.data)} />}
    />
  );
}

// The Project's filters beside the list; a pull asks again, as the list's own does.
function sidebar({ data, to }: PageProps): JSX.Element {
  const message = noIssuesBecause(data) || loadingIssues;

  if (data.state === 'gone')
    return (
      <RootRows
        choice={{ projects: data.projects, project: undefined, message }}
        state={{ overview: null, message: '' }}
        onRefresh={to.set({})}
      />
    );

  return (
    <RootRows
      choice={{ projects: data.projects, project: data.project, message }}
      state={{ overview: data.overview, message: '' }}
      onRefresh={to.set({})}
      selected={data.filter.id}
    />
  );
}

function filterDetail(props: PageProps): JSX.Element | null {
  const { data } = props;

  if (data.state === 'gone') return null;

  return <FilterDetail {...props} data={data} />;
}

type DetailProps = PageProps & {
  data: Exclude<FilterData, { state: 'gone' }>;
};

// The search's text is the App's at once and the Page state's once typing pauses.
function FilterDetail(props: DetailProps): JSX.Element {
  const { data, to, list } = props;

  return (
    <Screen {...screenProps(props)}>
      <List appearance="plain" density="compact" {...listProps(props)}>
        {issueTree(list.items).map((node) =>
          issueRow({ project: data.project, to }, node),
        )}
      </List>
    </Screen>
  );
}

type ScreenProps = Pick<
  PluginProps['Screen'],
  'title' | 'caption' | 'search' | 'value' | 'onChangeText'
>;

const screenProps = ({ data, to, query }: DetailProps): ScreenProps => ({
  title: data.filter.title,
  caption: data.filter.search,
  search: { label: 'Search Issues' },
  value: query,
  onChangeText: to.bind('query'),
});

type ListProps = Pick<
  PluginProps['List'],
  'footer' | 'empty' | 'pagination' | 'onRefresh'
>;

/*
 * The footer names the Project's repository, or why there are no Issues in its place. Load more appends
 * one more page, read from the last one's cursor; a pull goes back to the first page, read again.
 */
const listProps = ({ data, list, to }: DetailProps): ListProps => ({
  footer: noIssuesBecause(data) || repositoryText(data.project),
  empty: <EmptyState title={noIssuesBecause(data) || 'No Issues.'} />,
  pagination: { hasMore: list.hasMore, onLoadMore: list.loadMore },
  onRefresh: to.set({}),
});
