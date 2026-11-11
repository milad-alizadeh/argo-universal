import type {
  Argo,
  LoaderInput,
  PageState,
  PageTo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { answered } from './github-reads';
import type { Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import { IssueDetailPage } from './issue-detail';
import { loadIssueDetail, type IssueDetailData } from './issue-detail-data';
import { issuePattern, pathText, projectPattern } from './issue-paths';
import { RootPage, RootRows, type SidebarOverview } from './issue-root';
import { rootProjects, type RootProjects } from './root-projects';
import { signInGate, type GatedPage } from '@argo/plugin-kit';
import { signInOptions } from './github-account';

type Input = LoaderInput;

type To = PageTo;

// What every Issues page draws in its sidebar: the Projects, the one it is for, and that Project's overview.
type RootData = { choice: RootProjects; overview: SidebarOverview };

/*
 * The Issues section's Loader pages (ADR-0050): its landing page for the first Project, one Project's, and one
 * Issue's beside its Project's filters. A page path names its Project and Issue, so one pattern serves every one.
 */
export function defineIssuePages(argo: Argo, deps: IssueDeps): void {
  const { signIn } = deps;

  argo.pages.define('/', signInGate(signIn, signInOptions, rootLanding(deps)));
  argo.pages.define(projectPattern, signInGate(signIn, signInOptions, projectLanding(deps)));
  argo.pages.define(issuePattern, signInGate(signIn, signInOptions, issueLanding(deps)));
}

const rootLanding = (deps: IssueDeps): GatedPage<PageState, RootData> => ({
  load: (input) => loadRoot(deps, input),
  render: rootPage,
});

const projectLanding = (deps: IssueDeps): GatedPage<PageState, RootData> => ({
  load: (input) => loadRoot(deps, input, projectOf(input)),
  render: rootPage,
});

const issueLanding = (deps: IssueDeps): GatedPage<PageState, IssuePageData> => ({
  load: (input) => loadIssuePage(deps, input),
  render: issuePage,
});

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

async function overviewOf(
  deps: IssueDeps,
  read: Input['read'],
  project: Project | undefined,
): Promise<SidebarOverview> {
  if (!project) return noOverview;

  const query = deps.reads.overview({ projectId: project.id });
  const { value, message } = await answered(read(query));

  return { overview: value, message };
}

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
    detailOf(deps, input, choice.project),
  ]);

  return { choice, overview, detail };
}

const detailOf = (
  deps: IssueDeps,
  { read, params }: Input,
  project: Project | undefined,
): Promise<IssueDetailData> | null => {
  const number = Number(params.number);

  return project && Number.isSafeInteger(number)
    ? loadIssueDetail({ deps, read, project, number })
    : null;
};

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
