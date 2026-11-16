import {
  Button,
  ListDetail,
  Screen,
  Stack,
  Text,
  type Argo,
  type LoaderInput,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { projectScreen } from './issue-views';
import { filtersOf, noFilters } from './jira-filters';
import { pathText, projectPath, projectPattern } from './jira-paths';
import type { JiraReads } from './jira-reads';
import {
  listIssues,
  loadProjectView,
  type ProjectView,
  type Step,
} from './jira-setup';
import { storeQueries, storeReaders, type JiraSite } from './jira-store';
import { chooseProject, projectRows, type ArgoProject } from './project-rows';
import { sitePicker } from './site-picker';
import type {
  Framing,
  IssuesState,
  ProjectState,
  ProjectTo,
} from './view-frame';

// How long Jira's answers are fresh while the page is open: a revoked token or a change made in Jira shows within it.
const freshForMs = 60_000;

type Input = Pick<LoaderInput<ProjectState>, 'params' | 'state'>;

const projectIdOf = ({ params }: Pick<Input, 'params'>): string =>
  pathText(params.project ?? '');

const framingOf = (to: ProjectTo, input: Input): Framing => {
  const projectId = projectIdOf(input);

  return {
    projectId,
    to,
    state: input.state,
    sitePath: `${projectPath(projectId)}/site`,
  };
};

type ProjectData = { projects: ArgoProject[]; view: ProjectView };

type SiteData = { projects: ArgoProject[]; sites: JiraSite[]; chosen: string };

const listDetail = (
  projects: ArgoProject[],
  framing: Framing,
  detail: JSX.Element,
): JSX.Element => (
  <ListDetail
    title="Jira"
    list={projectRows(projects, framing.projectId)}
    detail={detail}
  />
);

// A site picker of its own, reached from "Change Jira site", which goes back to the issues once a site is in use.
const siteScreen = (data: SiteData, framing: Framing): JSX.Element => (
  <Screen title="Jira site">
    <Stack direction="column" gap={6}>
      <Text role="secondary">
        Which Atlassian site holds this Project’s issues?
      </Text>
      {sitePicker(data, framing)}
      <Button
        label="Show issues"
        disabled={data.chosen === ''}
        onPress={framing.to.go(projectPath(framing.projectId))}
      />
    </Stack>
  </Screen>
);

const onlyCloud = (sites: JiraSite[]): string | undefined =>
  sites.length === 1 ? sites.at(0)?.cloudId : undefined;

async function chosenSite({
  read,
  ...input
}: LoaderInput<ProjectState>): Promise<Omit<SiteData, 'projects'>> {
  const sites = storeReaders.sites(await read(storeQueries.sites));
  const choiceRead = await read(storeQueries.choice(projectIdOf(input)));
  const choice = storeReaders.choice(choiceRead);

  return { sites, chosen: choice.cloudId ?? onlyCloud(sites) ?? '' };
}

type IssuesInput = LoaderInput<IssuesState>;

const stepOf = (reads: JiraReads, input: IssuesInput): Step => ({
  read: input.read,
  reads,
  projectId: projectIdOf(input),
  filters: filtersOf(input.state),
});

/*
 * A draw's Loader and paged list both need the step the Project is at, with the same input: it is worked out once per
 * draw, so the list's first page is the one the Loader read.
 */
function projectViews(
  reads: JiraReads,
): (input: IssuesInput) => Promise<ProjectView> {
  const views = new WeakMap<IssuesInput, Promise<ProjectView>>();

  return (input) => {
    const view = views.get(input) ?? loadProjectView(stepOf(reads, input));

    views.set(input, view);

    return view;
  };
}

type ViewOf = ReturnType<typeof projectViews>;

async function loadProject(
  argo: Argo,
  viewOf: ViewOf,
  input: IssuesInput,
): Promise<ProjectData> {
  const [projects, view] = await Promise.all([
    argo.projects.list(),
    viewOf(input),
  ]);

  return { projects, view };
}

// The filters are Page state, so going back shows the same filtered view; the list is read a page at a time.
function defineProjectPage(argo: Argo, reads: JiraReads): void {
  const viewOf = projectViews(reads);

  argo.pages.define(projectPattern, {
    state: { site: '', ...noFilters },
    every: freshForMs,
    load: (input) => loadProject(argo, viewOf, input),
    list: async (input, cursor) =>
      listIssues(stepOf(reads, input), await viewOf(input), cursor),
    render: ({ projects, view }, to, input) => {
      const framing = framingOf(to, input);
      const listing = { to, filters: filtersOf(input.state), list: input.list };

      return listDetail(
        projects,
        framing,
        projectScreen(view, framing, listing),
      );
    },
  });
}

const defineSitePage = (argo: Argo): void =>
  argo.pages.define(`${projectPattern}/site`, {
    state: { site: '' },
    load: async (input): Promise<SiteData> => ({
      projects: await argo.projects.list(),
      ...(await chosenSite(input)),
    }),
    render: (data, to, input) => {
      const framing = framingOf(to, input);

      return listDetail(data.projects, framing, siteScreen(data, framing));
    },
  });

/*
 * The Jira section's Loader pages (ADR-0050): the landing page lists each Project, a Project's page draws the step
 * its Jira is at, and its site page changes the site. A page path names its Project, so one pattern serves every one.
 */
export function defineJiraPages(argo: Argo, reads: JiraReads): void {
  argo.pages.define('/', {
    load: () => argo.projects.list(),
    render: (projects) => (
      <ListDetail
        title="Jira"
        list={projectRows(projects)}
        empty={chooseProject}
      />
    ),
  });
  defineProjectPage(argo, reads);
  defineSitePage(argo);
}
