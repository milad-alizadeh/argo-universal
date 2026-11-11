import {
  EmptyState,
  List,
  ListDetail,
  Screen,
  type Argo,
  type LoaderInput,
  type PagedList,
  type PageTo,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import {
  filterState,
  filterTargets,
  loadFilter,
  noIssuesBecause,
  type FilterData,
  type FilterState,
} from './filter-loader';
import { listFilter } from './filter-list';
import { issueRow } from './filter-rows';
import type { Issue } from './github-issues';
import { repositoryText } from './issue-client';
import type { IssueDeps } from './issue-deps';
import { filterPattern } from './issue-paths';
import { RootRows, type RootRowsProps } from './issue-root';
import { issueTree } from './issue-tree';
import { signInGate, type GatedPage } from '@argo/plugin-kit';
import { signInOptions } from './github-account';
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
  argo.pages.define(filterPattern, signInGate(deps.signIn, signInOptions, filterPage(deps)));
}

function filterPage(
  deps: IssueDeps,
): GatedPage<FilterState, FilterData, Issue> {
  const targetOf = filterTargets(deps);

  return {
    state: filterState,
    load: (input) => loadFilter(deps, input.read, targetOf(input)),
    list: (input, cursor) => listOf({ deps, targetOf, input }, cursor),
    render: (data, to, { state, list }) => (
      <FilterPage {...{ data, to, list }} query={state.query} />
    ),
  };
}

type Targets = ReturnType<typeof filterTargets>;

// What a draw's list reads: its page's deps and target, and its input.
type ListSource = { deps: IssueDeps; targetOf: Targets; input: LoaderInput<FilterState> };

const listOf = (
  { deps, targetOf, input }: ListSource,
  cursor: string | null,
): ReturnType<typeof listFilter> =>
  listFilter(
    { deps, read: input.read, target: targetOf(input) },
    input.state.query,
    cursor,
  );

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

// What the filters beside the list show: nothing for a page that is gone.
type Shown = Pick<RootRowsProps, 'selected'> &
  Pick<RootRowsProps['choice'], 'project'> &
  Pick<RootRowsProps['state'], 'overview'>;

const shownOf = (data: FilterData): Shown =>
  data.state === 'gone'
    ? { project: undefined, overview: null, selected: undefined }
    : {
        project: data.project,
        overview: data.overview,
        selected: data.filter.id,
      };

// The Project's filters beside the list; a pull asks again, as the list's own does.
function sidebar({ data, to }: PageProps): JSX.Element {
  const message = noIssuesBecause(data) || loadingIssues;
  const { project, overview, selected } = shownOf(data);

  return (
    <RootRows
      choice={{ projects: data.projects, project, message }}
      state={{ overview, message: '' }}
      onRefresh={to.set({})}
      selected={selected}
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
