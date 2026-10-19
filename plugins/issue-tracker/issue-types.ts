import type { Argo, PluginProps } from '@argo/plugin-kit';

// The Issue tracker's own data: Issues as a Tracker reports them, and the Trackers a Project can choose.
export type Project = Awaited<ReturnType<Argo['projects']['list']>>[number];

export type Issue = {
  number: number;
  title: string;
  status: string;
  body: string;
  url: string;
  labels: string[];
  assignees: string[];
};

export type TrackerClient = {
  authStatus: () => Promise<string>;
  listIssues: () => Promise<Issue[]>;
  getIssue: (number: number) => Promise<Issue>;
};

export type TrackerIcon = NonNullable<PluginProps['Label']['icon']>;

export type TrackerType = {
  id: string;
  name: string;
  icon: TrackerIcon;
  openClient: (originUrl: string | null | undefined) => TrackerClient | null;
};

export type PublicTracker = Pick<TrackerType, 'id' | 'name' | 'icon'>;

export type TrackerRegistry = {
  list: () => PublicTracker[];
  get: (id: string) => TrackerType | null;
  has: (id: string) => boolean;
};

export type TrackerStorage = {
  selectedTracker: (projectId: string) => Promise<string | null>;
  chooseTracker: (projectId: string, id: string | null) => Promise<void>;
  readCache: (projectId: string) => Promise<Issue[] | null>;
  writeCache: (projectId: string, issues: Issue[]) => Promise<void>;
  updateCache: (projectId: string, issue: Issue) => Promise<void>;
};

export type Setter<Value> = (value: Value) => void;

export type IssueSelection = { type: 'issue'; issue: Issue };

// A tap on the Issues page: a Project to show, or an Issue to open.
export type IssueEvent = IssueSelection | { type: 'project'; id: string };

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
};

// The Issue list and an open Issue draw the page apart from its selection.
export type PageProps = Omit<IssuePage, 'selected'>;
