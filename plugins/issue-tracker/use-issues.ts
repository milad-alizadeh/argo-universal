import { useEffect, useState, type Argo } from '@argo/plugin-kit';
import type { Issue, IssueStatus } from './github-issues';
import { githubError } from './github-tracker';
import { setIssueStatus, type Project } from './issue-data';
import type { TrackerRegistry } from './tracker-registry';
import type { TrackerStorage } from './tracker-storage';
import { useProjectIssues } from './use-project-issues';

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

type ProjectSetters = {
  setProjects: Setter<Project[]>;
  setProjectId: Setter<string | null>;
  setMessage: Setter<string>;
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
    ...pageActions(state),
    onStatus: (status) => changeStatus({ state, storage, trackers }, status),
  };
}

function useIssueData(
  argo: Argo,
  state: IssueState,
  dependencies: Pick<IssuePage, 'storage' | 'trackers'>,
): void {
  useProjects(argo, state);
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

function useProjects(argo: Argo, state: IssueState): void {
  const load = argo.projects.list;
  const [, setProjects] = state.projects;
  const [, setProjectId] = state.projectId;
  const [, setMessage] = state.message;

  useEffect(() => {
    return observeProjects(load, { setProjects, setProjectId, setMessage });
  }, [load, setProjects, setProjectId, setMessage]);
}

function observeProjects(
  load: Argo['projects']['list'],
  setters: ProjectSetters,
): () => void {
  let active = true;

  void load().then(
    (rows) => showProjects(rows, setters, active),
    () => reportProjectError(active, setters.setMessage),
  );

  return () => {
    active = false;
  };
}

function showProjects(
  rows: Project[],
  setters: ProjectSetters,
  active: boolean,
): void {
  if (!active) return;

  setters.setProjects(rows);
  selectFirstProject(rows, setters.setProjectId);
  setters.setMessage(projectsMessage(rows));
}

function selectFirstProject(
  rows: Project[],
  setProjectId: Setter<string | null>,
): void {
  setProjectId(rows[0]?.id ?? null);
}

function projectsMessage(rows: Project[]): string {
  return rows.length === 0 ? 'No Projects yet.' : 'Loading Issues…';
}

function reportProjectError(active: boolean, setMessage: Setter<string>): void {
  if (active) setMessage('Could not load Projects.');
}

type PageState = Omit<
  IssuePage,
  'storage' | 'trackers' | 'onStatus' | keyof PageActions
>;

type PageActions = Pick<IssuePage, 'setMessage' | 'onIssue' | 'onBack'>;

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

function pageActions(state: IssueState): PageActions {
  const [, setSelected] = state.selected;

  return {
    setMessage: state.message[1],
    onIssue: (event) => updateSelection(event, state),
    onBack: () => setSelected(null),
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

type StatusInput = Pick<IssuePage, 'storage' | 'trackers'> & {
  state: IssueState;
};

async function changeStatus(
  { state, storage, trackers }: StatusInput,
  status: IssueStatus,
): Promise<void> {
  const issue = state.selected[0]?.issue;
  const project = pageState(state).project;

  if (!issue || !project) return;

  showStatus(state, issue.url, status);

  try {
    await setIssueStatus({ project, issue, storage, trackers }, status);
  } catch (error) {
    showStatus(state, issue.url, issue.status);
    throw new Error(githubError(error));
  }
}

// An Issue's URL names it across Projects, so a change lands on that Issue alone.
function showStatus(state: IssueState, url: string, status: IssueStatus): void {
  const withStatus = (issue: Issue): Issue =>
    issue.url === url ? { ...issue, status } : issue;

  state.issues[1]((issues) => issues.map(withStatus));
  state.selected[1](
    (selected) =>
      selected && { ...selected, issue: withStatus(selected.issue) },
  );
}
