import {
  Button,
  EmptyState,
  Icon,
  List,
  ListDetail,
  ListItem,
  Screen,
  Stack,
  Text,
  type Argo,
  type LoaderInput,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { filtersOf, noFilters } from './jira-filters';
import { projectPath, projectPattern, pathText } from './jira-paths';
import type { JiraReads } from './jira-reads';
import { listIssues, loadProjectView, type ProjectView } from './jira-setup';
import { storeQueries, storeReaders, type JiraSite } from './jira-store';
import {
  projectScreen,
  sitePicker,
  type Framing,
  type IssuesState,
  type ProjectState,
  type ProjectTo,
} from './project-views';

type Project = { id: string; name: string };

// How long Jira's answers are fresh while the page is open: a revoked token or a change made in Jira shows within it.
const freshForMs = 60_000;

const issuesIcon = { sf: 'list.bullet', material: 'list' } as const;

// The section list: each Argo Project's views of its Jira issues, the one the page is for selected.
const projectRows = (
  projects: Project[],
  selected: string | undefined,
): JSX.Element => (
  <List
    accessibilityLabel="Projects"
    empty={
      <EmptyState
        title="No Projects"
        description="Add a Project to Argo to see its Jira issues."
      />
    }
  >
    {projects.map((project) => (
      <List.Section key={project.id} title={project.name}>
        <ListItem
          key="issues"
          title="Issues"
          leading={<Icon name={issuesIcon} size="md" />}
          selected={project.id === selected}
          onPress={{ action: 'navigate', path: projectPath(project.id) }}
        />
      </List.Section>
    ))}
  </List>
);

const chooseProject = (
  <EmptyState
    title="Choose a Project"
    description="Pick a Project to see the Jira issues it tracks."
  />
);

const projectIdOf = ({ params }: Pick<LoaderInput, 'params'>): string =>
  pathText(params.project ?? '');

type ProjectData = { projects: Project[]; view: ProjectView };

type ProjectInput = LoaderInput<IssuesState>;

/*
 * A draw's Loader and paged list both need the step the Project is at, with the same input: it is worked out once per
 * draw, so the list's first page is the one the Loader read.
 */
function projectViews(
  reads: JiraReads,
): (input: ProjectInput) => Promise<ProjectView> {
  const views = new WeakMap<ProjectInput, Promise<ProjectView>>();

  return (input) => {
    const view =
      views.get(input) ??
      loadProjectView({
        read: input.read,
        reads,
        projectId: projectIdOf(input),
        filters: filtersOf(input.state),
      });

    views.set(input, view);

    return view;
  };
}

type SiteData = { projects: Project[]; sites: JiraSite[]; chosen: string };

const framingOf = (
  projectId: string,
  to: ProjectTo,
  state: ProjectState,
): Framing => ({
  projectId,
  to,
  state,
  sitePath: `${projectPath(projectId)}/site`,
});

// A site picker of its own, reached from "Change Jira site", which goes back to the issues once a site is in use.
const siteScreen = (data: SiteData, framing: Framing): JSX.Element => (
  <Screen title="Jira site">
    <Stack direction="column" gap={6}>
      <Text role="secondary">
        Which Atlassian site holds this Project’s issues?
      </Text>
      {sitePicker(data.sites, data.chosen, framing)}
      <Button
        label="Show issues"
        disabled={data.chosen === ''}
        onPress={framing.to.go(projectPath(framing.projectId))}
      />
    </Stack>
  </Screen>
);

async function chosenSite(
  read: LoaderInput['read'],
  projectId: string,
): Promise<{ sites: JiraSite[]; chosen: string }> {
  const sites = storeReaders.sites(await read(storeQueries.sites));
  const choice = storeReaders.choice(
    await read(storeQueries.choice(projectId)),
  );
  const only = sites.length === 1 ? sites[0]?.cloudId : undefined;

  return { sites, chosen: choice.cloudId ?? only ?? '' };
}

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
        list={projectRows(projects, undefined)}
        empty={chooseProject}
      />
    ),
  });

  const viewOf = projectViews(reads);

  // The filters are Page state, so going back shows the same filtered view; the list is read a page at a time.
  argo.pages.define(projectPattern, {
    state: { site: '', ...noFilters },
    every: freshForMs,
    load: async (input): Promise<ProjectData> => {
      const [projects, view] = await Promise.all([
        argo.projects.list(),
        viewOf(input),
      ]);

      return { projects, view };
    },
    list: (input, cursor) =>
      listIssues(
        {
          read: input.read,
          reads,
          projectId: projectIdOf(input),
          filters: filtersOf(input.state),
        },
        viewOf(input),
        cursor,
      ),
    render: (data, to, input) => {
      const projectId = projectIdOf(input);
      const framing = framingOf(projectId, to, input.state);

      return (
        <ListDetail
          title="Jira"
          list={projectRows(data.projects, projectId)}
          detail={projectScreen(data.view, framing, {
            to,
            filters: filtersOf(input.state),
            list: input.list,
          })}
        />
      );
    },
  });

  argo.pages.define(`${projectPattern}/site`, {
    state: { site: '' },
    load: async (input): Promise<SiteData> => ({
      projects: await argo.projects.list(),
      ...(await chosenSite(input.read, projectIdOf(input))),
    }),
    render: (data, to, input) => {
      const projectId = projectIdOf(input);

      return (
        <ListDetail
          title="Jira"
          list={projectRows(data.projects, projectId)}
          detail={siteScreen(data, framingOf(projectId, to, input.state))}
        />
      );
    },
  });
}
