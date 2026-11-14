import type { Argo, LoaderInput, PageState, PageTo } from '@argo/plugin-kit';
import { signInGate, type GatedPage } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { signInOptions } from './github-account';
import { projectById, type Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import { IssueDetailPage } from './issue-detail';
import { loadIssueDetail, type IssueDetailData } from './issue-detail-data';
import { issuePattern, pathText, projectPattern } from './issue-paths';
import { RootPage, RootRows } from './issue-root';
import { loadSidebar, type Sidebar, type SidebarSelection } from './sidebar';

type Input = LoaderInput;

type To = PageTo;

// What every Issues page draws in its sidebar: each Project's section, and the Project the page is for.
type RootData = { sidebar: Sidebar; selected?: SidebarSelection };

/*
 * The Issues section's Loader pages (ADR-0050): its landing page for the first Project, one Project's, and one
 * Issue's beside its Project's filters. A page path names its Project and Issue, so one pattern serves every one.
 */
export function defineIssuePages(argo: Argo, deps: IssueDeps): void {
  const { signIn } = deps;

  argo.pages.define('/', signInGate(signIn, signInOptions, rootLanding(deps)));
  argo.pages.define(
    projectPattern,
    signInGate(signIn, signInOptions, projectLanding(deps)),
  );
  argo.pages.define(
    issuePattern,
    signInGate(signIn, signInOptions, issueLanding(deps)),
  );
}

const rootLanding = (deps: IssueDeps): GatedPage<PageState, RootData> => ({
  load: (input) => loadRoot(deps, input),
  render: rootPage,
});

const projectLanding = (deps: IssueDeps): GatedPage<PageState, RootData> => ({
  load: (input) => loadRoot(deps, input, projectOf(input)),
  render: rootPage,
});

const issueLanding = (
  deps: IssueDeps,
): GatedPage<PageState, IssuePageData> => ({
  load: (input) => loadIssuePage(deps, input),
  render: issuePage,
});

const rootPage = (
  data: RootData,
  to: To,
  { context }: Pick<Input, 'context'>,
): JSX.Element => <RootPage rows={sidebarRows(data, to, context)} />;

const issuePage = (
  data: IssuePageData,
  to: To,
  { params, context }: Pick<Input, 'params' | 'context'>,
): JSX.Element => (
  <RootPage
    rows={sidebarRows(data, to, context)}
    detail={issueDetail(data, to, params)}
  />
);

const projectOf = ({ params }: Pick<Input, 'params'>): string =>
  pathText(params.project ?? '');

// Every Project's section, and the Project the page is for; a pull reads them again.
async function loadRoot(
  deps: IssueDeps,
  { read }: Input,
  projectId?: string,
): Promise<RootData> {
  const sidebar = await loadSidebar(deps, read);

  return {
    sidebar,
    selected: projectId === undefined ? undefined : { projectId },
  };
}

const sidebarRows = (
  { sidebar, selected }: RootData,
  to: To,
  context: Input['context'],
): JSX.Element => (
  <RootRows
    sidebar={sidebar}
    selected={selected}
    onRefresh={to.set({})}
    platform={context.surface?.platform}
  />
);

type IssuePageData = RootData & {
  project: Project | null;
  detail: IssueDetailData | null;
};

// The sidebar and the Issue at once: the Issue's Project is any Project, with a Tracker or not.
async function loadIssuePage(
  deps: IssueDeps,
  input: Input,
): Promise<IssuePageData> {
  const projectId = projectOf(input);

  const [sidebar, { project, detail }] = await Promise.all([
    loadSidebar(deps, input.read),
    issueOf(deps, input, projectId),
  ]);

  return { sidebar, selected: { projectId }, project, detail };
}

async function issueOf(
  deps: IssueDeps,
  input: Input,
  projectId: string,
): Promise<Pick<IssuePageData, 'project' | 'detail'>> {
  const project = await projectOrNone(deps, projectId);

  return { project, detail: await detailOf(deps, input, project) };
}

// A Project that is gone, or Projects that cannot be read, leave the Issue page with none.
const projectOrNone = (
  deps: IssueDeps,
  projectId: string,
): Promise<Project | null> =>
  projectById(deps.listProjects, projectId).then(
    (project) => project ?? null,
    () => null,
  );

const detailOf = (
  deps: IssueDeps,
  { read, params }: Input,
  project: Project | null,
): Promise<IssueDetailData> | null => {
  const number = Number(params.number);

  return project && Number.isSafeInteger(number)
    ? loadIssueDetail({ deps, read, project, number })
    : null;
};

function issueDetail(
  { project, detail }: IssuePageData,
  to: To,
  params: Input['params'],
): JSX.Element | null {
  if (!project || !detail) return null;

  return (
    <IssueDetailPage
      data={detail}
      projectId={project.id}
      number={Number(params.number)}
      to={to}
    />
  );
}
