import { useState, type Argo } from '@argo/plugin-kit';
import type { Issue, IssueStatus } from './github-issues';
import type { Project } from './issue-data';
import { changeStatus, statusRequest, type StatusChange } from './issue-status';
import type { TrackerRegistry } from './tracker-registry';
import type { TrackerStorage } from './tracker-storage';
import { useProjectIssues } from './use-project-issues';
import { useProjects, type ProjectSetters } from './use-projects';

type Setter<Value> = (value: Value | ((current: Value) => Value)) => void;

export type IssueSelection = { type: 'issue'; issue: Issue };

// A tap on the Issues page: a Project to show, or an Issue to open.
type IssueEvent = IssueSelection | { type: 'project'; id: string };

export type IssuePage = {
  projects: Project[];
  projectId: string | null;
  project: Project | undefined;
  trackerId: string | null;
  issues: Issue[];
  message: string;
  selected: IssueSelection | null;
  storage: TrackerStorage;
  trackers: TrackerRegistry;
  setMessage: Setter<string>;
  onIssue: (event: IssueEvent) => void;
  onBack: () => void;
  // Shows the open Issue's new status at once, and the old one again when the Tracker refuses it.
  onStatus: (status: IssueStatus) => Promise<void>;
};

// The Issue list and an open Issue draw the page apart from its selection.
export type PageProps = Omit<IssuePage, 'selected'>;

type State<Value> = [Value, Setter<Value>];

type IssueState = {
  projects: State<Project[]>;
  projectId: State<string | null>;
  selected: State<IssueSelection | null>;
  issues: State<Issue[]>;
  message: State<string>;
  trackerId: State<string | null>;
};

export function useIssuePage(
  argo: Argo,
  storage: TrackerStorage,
  trackers: TrackerRegistry,
): IssuePage {
  const state = useIssueState();

  useIssueData(argo, state, { storage, trackers });

  return {
    ...pageState(state),
    storage,
    trackers,
    ...pageActions(state, { storage, trackers }),
  };
}

function useIssueData(
  argo: Argo,
  state: IssueState,
  dependencies: Pick<IssuePage, 'storage' | 'trackers'>,
): void {
  useProjects(argo.projects.list, projectSetters(state));
  useProjectIssues({
    ...dependencies,
    projectId: state.projectId[0],
    projects: state.projects[0],
    setIssues: state.issues[1],
    setMessage: state.message[1],
    setTrackerId: state.trackerId[1],
  });
}

function useIssueState(): IssueState {
  return {
    projects: useState<Project[]>([]),
    projectId: useState<string | null>(null),
    selected: useState<IssueSelection | null>(null),
    issues: useState<Issue[]>([]),
    message: useState('Loading Projects…'),
    trackerId: useState<string | null>(null),
  };
}

type PageState = Omit<IssuePage, 'storage' | 'trackers' | keyof PageActions>;

type PageActions = Pick<
  IssuePage,
  'setMessage' | 'onIssue' | 'onBack' | 'onStatus'
>;

function pageState(state: IssueState): PageState {
  const [projects] = state.projects;
  const [projectId] = state.projectId;

  return {
    projects,
    projectId,
    project: projects.find((row) => row.id === projectId),
    trackerId: state.trackerId[0],
    issues: state.issues[0],
    message: state.message[0],
    selected: state.selected[0],
  };
}

function pageActions(
  state: IssueState,
  dependencies: Pick<IssuePage, 'storage' | 'trackers'>,
): PageActions {
  const [, setSelected] = state.selected;

  return {
    setMessage: state.message[1],
    onIssue: (event) => updateSelection(event, state),
    onBack: () => setSelected(null),
    onStatus: (status) =>
      changeStatus(statusChange(state, dependencies), status),
  };
}

function updateSelection(event: IssueEvent, state: IssueState): void {
  if (event.type === 'project') return selectProject(event.id, state);

  state.selected[1](event);
}

function selectProject(id: string, state: IssueState): void {
  state.issues[1]([]);
  state.trackerId[1](null);
  state.message[1]('Loading Issues…');
  state.projectId[1](id);
  state.selected[1](null);
}

function statusChange(
  state: IssueState,
  dependencies: Pick<IssuePage, 'storage' | 'trackers'>,
): StatusChange<IssueSelection> {
  return {
    request: statusRequest(
      pageState(state).project,
      state.selected[0],
      dependencies,
    ),
    setIssues: state.issues[1],
    setSelected: state.selected[1],
  };
}

const projectSetters = (state: IssueState): ProjectSetters => ({
  setProjects: state.projects[1],
  setProjectId: state.projectId[1],
  setMessage: state.message[1],
});
