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
  listFilter,
  loadFilter,
  type FilterData,
  type FilterState,
} from './filter-loader';
import { issueRow } from './filter-rows';
import { loadingIssues } from './filter-shown';
import type { Issue } from './github-issues';
import { repositoryText, type Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import type { IssueFilter } from './issue-filters';
import { filterPattern } from './issue-paths';
import { RootRows } from './issue-root';
import { issueTree } from './issue-tree';
import { reloadOverviews } from './overview-requests';

type To = PageTo<FilterState>;

/*
 * One Project's filter list (ADR-0050): the Loader reads the Projects and the overview while the kit reads
 * the pages of Issues the App shows; the Render draws the sidebar beside them. The search narrows the Issues
 * once typing pauses, load more appends the next page, a pull starts again from the first, and a row's
 * Action closes or reopens its Issue as an Operation.
 */
export function defineFilterPage(argo: Argo, deps: IssueDeps): void {
  // A status change on any page, the Issue page's own included, leaves the counts and drawn lists stale.
  deps.changes.subscribe(() => {
    reloadOverviews(deps);
    argo.pages.stale();
  });
  argo.pages.define(filterPattern, filterPage(deps, argo.pages.stale));
}

const filterPage = (
  deps: IssueDeps,
  changed: () => void,
): LoaderPage<FilterState, FilterData, Issue> => ({
  state: filterState,
  load: (input) => loadFilter({ ...deps, changed }, input),
  list: (input, cursor) => listFilter(deps, input, cursor),
  render: (data, to, { state, list }) => (
    <FilterPage {...{ deps, data, to, list }} query={state.query} />
  ),
});

type PageProps = {
  deps: IssueDeps;
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
      empty={<EmptyState title={props.data.message} />}
    />
  );
}

// The Project's filters beside the list; a pull asks again, as the list's own does.
function sidebar({ deps, data, to }: PageProps): JSX.Element {
  const message = data.message || loadingIssues;

  return (
    <RootRows
      deps={deps}
      choice={{ projects: data.projects, project: data.project, message }}
      state={{ overview: data.overview, message: '' }}
      onRefresh={to.set({})}
      selected={data.filter?.id}
    />
  );
}

function filterDetail(props: PageProps): JSX.Element | null {
  const { project, filter } = props.data;

  if (!project || !filter) return null;

  return <FilterDetail {...props} data={{ ...props.data, project, filter }} />;
}

type DetailProps = PageProps & {
  data: FilterData & { project: Project; filter: IssueFilter };
};

// The search's text is the App's at once and the Page state's once typing pauses.
function FilterDetail(props: DetailProps): JSX.Element {
  const { deps, data, to, list } = props;

  return (
    <Screen {...screenProps(props)}>
      <List appearance="plain" density="compact" {...listProps(props)}>
        {issueTree(list.items).map((node) =>
          issueRow({ deps, project: data.project, to }, node),
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
  footer: data.message || repositoryText(data.project),
  empty: <EmptyState title={data.message || 'No Issues.'} />,
  pagination: { hasMore: list.hasMore, onLoadMore: list.loadMore },
  onRefresh: to.set({}),
});
