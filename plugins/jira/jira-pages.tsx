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
import { filtersOf, noFilters } from './jira-filters';
import { projectIdOf, projectPath, projectPattern } from './jira-paths';
import type { JiraReads, Reading, Refused } from './jira-reads';
import { storeQueries, storeReaders, type JiraSite } from './jira-store';
import { projectLoader } from './project-loader';
import { chooseProject, projectRows, type ArgoProject } from './project-rows';
import { sitePicker } from './site-picker';
import type {
  Framing,
  IssuesState,
  Listing,
  ProjectState,
  ProjectTo,
} from './view-frame';

// How long Jira's answers are fresh while the page is open: a revoked token or a change made in Jira shows within it.
const freshForMs = 60_000;

type Input = Pick<LoaderInput<ProjectState>, 'params' | 'state'>;

const framingOf = (to: ProjectTo, input: Input): Framing => {
  const projectId = projectIdOf(input);

  return {
    projectId,
    to,
    state: input.state,
    sitePath: `${projectPath(projectId)}/site`,
  };
};

type SiteData = { projects: ArgoProject[]; sites: JiraSite[]; chosen: string };

const listDetail = (
  projects: ArgoProject[],
  framing: Framing,
  detail: JSX.Element,
): JSX.Element => (
  <ListDetail
    title="Jira"
    list={projectRows(projects, {
      selected: framing.projectId,
      onRefresh: framing.to.set({}),
    })}
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

type Rendered = { list: Listing['list']; state: IssuesState };

const listingOf = (
  { to, statuses }: Pick<Listing, 'to' | 'statuses'>,
  { list, state }: Rendered,
): Listing => ({
  to,
  filters: filtersOf(state),
  list,
  view: state.view,
  statuses,
});

// The filters and the view are Page state, so going back shows the same view; the list is read a page at a time.
const defineProjectPage = (reading: Reading, reads: JiraReads): void =>
  reading.argo.pages.define(projectPattern, {
    state: { site: '', ...noFilters, view: 'list' },
    every: freshForMs,
    ...projectLoader(reading, reads),
    render: ({ projects, view, statuses }, to, input) => {
      const framing = framingOf(to, input);
      const listing = listingOf({ to, statuses }, input);

      return listDetail(
        projects,
        framing,
        projectScreen(view, framing, listing),
      );
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
const defineLandingPage = (argo: Argo): void =>
  argo.pages.define('/', {
    load: () => argo.projects.list(),
    render: (projects, to) => (
      <ListDetail
        title="Jira"
        list={projectRows(projects, { onRefresh: to.set({}) })}
        empty={chooseProject}
      />
    ),
  });

export function defineJiraPages(
  argo: Argo,
  { reads, refused }: { reads: JiraReads; refused: Refused },
): void {
  defineLandingPage(argo);
  defineProjectPage({ argo, refused }, reads);
  defineSitePage(argo);
  defineIssuePage(argo, reads);
}
