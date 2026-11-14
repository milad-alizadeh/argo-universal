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
  type PluginSurface,
} from '@argo/plugin-kit';
import { signInGate, type GatedPage } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { noIssues } from './filter-empty';
import { listFilter } from './filter-list';
import {
  filterState,
  filterTargets,
  loadFilter,
  noIssuesBecause,
  type FilterData,
  type FilterState,
} from './filter-loader';
import { filterScreenProps } from './filter-page-header';
import { issueRow } from './filter-rows';
import { signInOptions } from './github-account';
import type { Issue } from './github-issues';
import { repositoryText } from './issue-client';
import type { IssueDeps } from './issue-deps';
import { filterPattern } from './issue-paths';
import { RootRows } from './issue-root';
import { issueTree } from './issue-tree';
import { loadSidebar, type Sidebar, type SidebarSelection } from './sidebar';

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
  argo.pages.define(
    filterPattern,
    signInGate(deps.signIn, signInOptions, filterPage(deps)),
  );
}

function filterPage(deps: IssueDeps): GatedPage<FilterState, PageData, Issue> {
  const targetOf = filterTargets(deps);

  return {
    state: filterState,
    load: (input) => loadPage(deps, input, targetOf),
    list: (input, cursor) => listOf({ deps, targetOf, input }, cursor),
    render: ({ data, sidebar }, to, { state, list, context }) => (
      <FilterPage
        {...{ data, sidebar, to, list }}
        query={state.query}
        platform={context.surface?.platform}
      />
    ),
  };
}

// The filter's own data, and every Project's section beside it.
type PageData = { data: FilterData; sidebar: Sidebar };

async function loadPage(
  deps: IssueDeps,
  input: LoaderInput<FilterState>,
  targetOf: Targets,
): Promise<PageData> {
  const [data, sidebar] = await Promise.all([
    loadFilter(deps, input.read, targetOf(input)),
    loadSidebar(deps, input.read),
  ]);

  return { data, sidebar };
}

type Targets = ReturnType<typeof filterTargets>;

// What a draw's list reads: its page's deps and target, and its input.
type ListSource = {
  deps: IssueDeps;
  targetOf: Targets;
  input: LoaderInput<FilterState>;
};

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
  sidebar: Sidebar;
  to: To;
  query: string;
  list: PagedList<Issue>;
  platform?: PluginSurface['platform'];
};

function FilterPage(props: PageProps): JSX.Element {
  return (
    <ListDetail
      title="Issues"
      list={sidebarRows(props)}
      detail={filterDetail(props)}
      empty={<EmptyState title={noIssuesBecause(props.data)} />}
    />
  );
}

// The row selected beside the list: none for a page that is gone.
const selectedOf = (data: FilterData): SidebarSelection | undefined =>
  data.state === 'gone'
    ? undefined
    : { projectId: data.project.id, filterId: data.filter.id };

// Every Project's filters beside the list; a pull asks again, as the list's own does.
const sidebarRows = ({
  data,
  sidebar,
  to,
  platform,
}: PageProps): JSX.Element => (
  <RootRows
    sidebar={sidebar}
    platform={platform}
    selected={selectedOf(data)}
    onRefresh={to.set({})}
  />
);

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
    <Screen {...filterScreenProps(props)}>
      <List appearance="plain" density="compact" {...listProps(props)}>
        {issueTree(list.items).map((node) =>
          issueRow({ project: data.project, to }, node),
        )}
      </List>
    </Screen>
  );
}

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
  empty: noIssues(data, to),
  pagination: { hasMore: list.hasMore, onLoadMore: list.loadMore },
  onRefresh: to.set({}),
});
