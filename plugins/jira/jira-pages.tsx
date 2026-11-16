import {
  Button,
  ListDetail,
  Screen,
  Stack,
  type Argo,
  type LoaderInput,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { defineIssuePage } from './issue-page';
import { projectScreen } from './issue-views';
import { pathText, projectPath, projectPattern } from './jira-paths';
import type { JiraReads } from './jira-reads';
import { loadProjectView, type ProjectView } from './jira-setup';
import { storeQueries, storeReaders, type JiraSite } from './jira-store';
import { chooseProject, projectRows, type ArgoProject } from './project-rows';
import { sitePicker } from './site-picker';
import type { Framing, ProjectState, ProjectTo } from './view-frame';

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

async function loadProject(
  argo: Argo,
  reads: JiraReads,
  input: LoaderInput<ProjectState>,
): Promise<ProjectData> {
  const step = { read: input.read, reads, projectId: projectIdOf(input) };

  const [projects, view] = await Promise.all([
    argo.projects.list(),
    loadProjectView(step),
  ]);

  return { projects, view };
}

const defineProjectPage = (argo: Argo, reads: JiraReads): void =>
  argo.pages.define(projectPattern, {
    state: { site: '' },
    every: freshForMs,
    load: (input) => loadProject(argo, reads, input),
    render: ({ projects, view }, to, input) => {
      const framing = framingOf(to, input);

      return listDetail(projects, framing, projectScreen(view, framing));
    },
  });

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
  defineIssuePage(argo, reads);
}
