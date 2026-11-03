import {
  EmptyState,
  List,
  ListDetail,
  Screen,
  type Argo,
  type PageTo,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import {
  filterState,
  loadFilter,
  type FilterData,
  type FilterState,
} from './filter-loader';
import { issueRow } from './filter-rows';
import { loadingIssues, pageSize } from './filter-shown';
import { repositoryText, type Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import type { IssueFilter } from './issue-filters';
import { filterPattern } from './issue-paths';
import { RootRows } from './issue-root';
import { issueTree } from './issue-tree';

type To = PageTo<FilterState>;

/*
 * One Project's filter list (ADR-0050): the Loader reads the Projects, the overview and up to the Page
 * state's limit of Issues at once; the Render draws the sidebar beside them. Load more asks for a
 * longer list, a pull asks again, and a row's Action closes or reopens its Issue as an Operation.
 */
export function defineFilterPage(argo: Argo, deps: IssueDeps): void {
  argo.pages.define(filterPattern, {
    state: filterState,
    load: (input) => loadFilter(deps, input),
    render: (data, to) => <FilterPage deps={deps} data={data} to={to} />,
  });
}

type PageProps = { deps: IssueDeps; data: FilterData; to: To };

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

function filterDetail({ deps, data, to }: PageProps): JSX.Element | null {
  const { project, filter } = data;

  if (!project || !filter) return null;

  return (
    <FilterDetail deps={deps} data={{ ...data, project, filter }} to={to} />
  );
}

type DetailProps = {
  deps: IssueDeps;
  data: FilterData & { project: Project; filter: IssueFilter };
  to: To;
};

function FilterDetail({ deps, data, to }: DetailProps): JSX.Element {
  const { filter, issues, project } = data;

  return (
    <Screen title={filter.title} caption={filter.search}>
      <List appearance="plain" density="compact" {...listProps(data, to)}>
        {issueTree(issues).map((node) => issueRow({ deps, project, to }, node))}
      </List>
    </Screen>
  );
}

type ListProps = Pick<
  PluginProps['List'],
  'footer' | 'empty' | 'pagination' | 'onRefresh'
>;

/*
 * The footer names the Project's repository, or why there are no Issues in its place. A full list may
 * have more: load more asks for a longer one, and a pull asks again.
 */
const listProps = (data: DetailProps['data'], to: To): ListProps => ({
  footer: data.message || repositoryText(data.project),
  empty: <EmptyState title={data.message || 'No Issues.'} />,
  pagination: {
    hasMore: data.issues.length >= data.limit,
    onLoadMore: to.set({ limit: data.limit + pageSize }),
  },
  onRefresh: to.set({}),
});
