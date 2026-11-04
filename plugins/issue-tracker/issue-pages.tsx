import type { Argo, LoaderInput, PageTo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import { IssueDetailPage } from './issue-detail';
import { loadIssueDetail, type IssueDetailData } from './issue-detail-data';
import { issuePattern, pathText, projectPattern } from './issue-paths';
import { RootPage, RootRows, type SidebarOverview } from './issue-root';
import { rootProjects, type RootProjects } from './root-projects';

type Input = LoaderInput;

type To = PageTo;

// What every Issues page draws in its sidebar: the Projects, the one it is for, and that Project's overview.
type RootData = { choice: RootProjects; overview: SidebarOverview };

/*
 * The Issues section's Loader pages (ADR-0050): its landing page for the first Project, one Project's, and one
 * Issue's beside its Project's filters. A page path names its Project and Issue, so one pattern serves every one.
 */
export function defineIssuePages(argo: Argo, deps: IssueDeps): void {
  argo.pages.define('/', {
    load: (input) => loadRoot(deps, input),
    render: rootPage,
  });
  argo.pages.define(projectPattern, {
    load: (input) => loadRoot(deps, input, projectOf(input)),
    render: rootPage,
  });
  argo.pages.define(issuePattern, {
    load: (input) => loadIssuePage(deps, input),
    render: issuePage,
  });
}

const rootPage = (data: RootData, to: To): JSX.Element => (
  <RootPage rows={sidebar(data, to)} />
);

const issuePage = (
  data: IssuePageData,
  to: To,
  { params }: Pick<Input, 'params'>,
): JSX.Element => (
  <RootPage rows={sidebar(data, to)} detail={issueDetail(data, to, params)} />
);

const projectOf = ({ params }: Pick<Input, 'params'>): string =>
  pathText(params.project ?? '');

// The Projects, and for the one the page is for, the overview Argo keeps for it; a pull reads it again.
async function loadRoot(
  deps: IssueDeps,
  { read }: Input,
  projectId?: string,
): Promise<RootData> {
  const choice = await rootProjects(deps, projectId);

  return { choice, overview: await overviewOf(deps, read, choice.project) };
}

const noOverview: SidebarOverview = { overview: null, message: '' };

const overviewOf = (
  deps: IssueDeps,
  read: Input['read'],
  project: Project | undefined,
): Promise<SidebarOverview> =>
  project
    ? read(deps.overview({ projectId: project.id })).then(
        (overview) => ({ overview, message: '' }),
        (error: Error) => ({ overview: null, message: error.message }),
      )
    : Promise.resolve(noOverview);

const sidebar = ({ choice, overview }: RootData, to: To): JSX.Element => (
  <RootRows choice={choice} state={overview} onRefresh={to.set({})} />
);

type IssuePageData = RootData & { detail: IssueDetailData | null };

// The sidebar and the Issue at once: the Issue page reads its Project's overview as every Issues page does.
async function loadIssuePage(
  deps: IssueDeps,
  input: Input,
): Promise<IssuePageData> {
  const choice = await rootProjects(deps, projectOf(input));

  const [overview, detail] = await Promise.all([
    overviewOf(deps, input.read, choice.project),
    detailOf(deps, choice.project, Number(input.params.number)),
  ]);

  return { choice, overview, detail };
}

const detailOf = (
  deps: IssueDeps,
  project: Project | undefined,
  number: number,
): Promise<IssueDetailData> | null =>
  project && Number.isSafeInteger(number)
    ? loadIssueDetail({ deps, project, number })
    : null;

function issueDetail(
  { choice, detail }: IssuePageData,
  to: To,
  params: Input['params'],
): JSX.Element | null {
  if (!choice.project || !detail) return null;

  return (
    <IssueDetailPage
      data={detail}
      projectId={choice.project.id}
      number={Number(params.number)}
      to={to}
    />
  );
}
