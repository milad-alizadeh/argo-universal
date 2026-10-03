// PROTOTYPE: in-memory store. Nothing persists; reload resets it.
import { useSyncExternalStore } from 'react';
import { CATALOG, ISSUES, LIVE_SCRIPT, makeSessions, PROJECTS } from './fixtures';
import type { FeedRow, Issue, Project, Request, Session } from './types';

interface Toast {
  id: number;
  text: string;
  undo?: () => void;
}

interface State {
  sessions: Session[];
  issues: Issue[];
  showArchived: boolean;
  projects: Project[];
  // Signed-in accounts on the Server, by service; null is not connected.
  accounts: Record<'GitHub' | 'GitLab' | 'Linear', string | null>;
  toast?: Toast;
  log: string[];
}

let state: State = {
  sessions: makeSessions(),
  issues: ISSUES,
  showArchived: false,
  projects: PROJECTS,
  accounts: { GitHub: 'milad-alizadeh', GitLab: null, Linear: 'Argo' },
  log: [],
};
const listeners = new Set<() => void>();

function set(next: Partial<State>, event?: string) {
  state = {
    ...state,
    ...next,
    log: event ? [event, ...state.log].slice(0, 6) : state.log,
  };
  for (const listener of listeners) listener();
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => select(state),
    () => select(state),
  );
}

export function getState() {
  return state;
}

function patch(id: string, change: (s: Session) => Partial<Session>, event?: string) {
  set(
    {
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...change(s) } : s)),
    },
    event,
  );
}

export const actions = {
  addProject(project: Project) {
    set({ projects: [...state.projects, project] }, `add Project ${project.name} (${project.path})`);
    showToast(`Added ${project.name}`);
  },
  setTracker(name: string, tracker: Project['tracker']) {
    set(
      { projects: state.projects.map((p) => (p.name === name ? { ...p, tracker } : p)) },
      `${name} Issues → ${tracker ? `${tracker.kind}${tracker.team ? ` (${tracker.team})` : ''}` : 'none'}`,
    );
  },
  setAccount(service: keyof State['accounts'], user: string | null) {
    set({ accounts: { ...state.accounts, [service]: user } }, `${service} → ${user ?? 'disconnected'}`);
  },
  // A new Issue goes to the Project's tracker: Linear numbers by team prefix, GitHub by #.
  createIssue(project: Project, title: string, body: string) {
    const own = state.issues.filter((i) => i.project === project.name);
    const next = Math.max(0, ...own.map((i) => Number(i.number.replace(/\D/g, '')) || 0)) + 1;
    const linear = project.tracker?.kind === 'linear';
    const prefix = linear ? (own[0]?.number.split('-')[0] ?? project.name.slice(0, 2).toUpperCase()) : '';
    const number = linear ? `${prefix}-${next}` : `#${next}`;
    const issue: Issue = { id: `${project.name}-${next}`, number, project: project.name, title, body, status: linear ? 'Triage' : 'Open', category: linear ? 'triage' : 'todo', sessionIds: [] };
    set({ issues: [issue, ...state.issues] }, `create Issue ${number} in ${linear ? `Linear · ${project.tracker?.team}` : project.repository?.slug}`);
    return issue.id;
  },
  setShowArchived(showArchived: boolean) {
    set({ showArchived });
  },
  markRead(id: string) {
    const s = state.sessions.find((x) => x.id === id);
    if (s?.unread) patch(id, () => ({ unread: false }));
  },
  rename(id: string, title: string) {
    patch(id, () => ({ title }), `rename ${id} → "${title}"`);
  },
  archive(id: string) {
    patch(id, () => ({ archived: true }), `archive ${id} (worktree deleted in 3s, branch kept)`);
    const toastId = Date.now();
    set({
      toast: {
        id: toastId,
        text: 'Session archived',
        undo: () => {
          patch(id, () => ({ archived: false }), `undo archive ${id}`);
          set({ toast: undefined });
        },
      },
    });
    setTimeout(() => {
      if (state.toast?.id === toastId) set({ toast: undefined });
    }, 3000);
  },
  setting(id: string, key: 'mode' | 'model' | 'effort', value: string) {
    patch(
      id,
      (s) => ({ [key]: value, pendingSettings: s.state === 'running' }),
      `${key} → ${value}${getSession(id)?.state === 'running' ? ' (waits for next Turn)' : ''}`,
    );
  },
  send(id: string, text: string, images: number) {
    patch(
      id,
      (s) => ({
        feed: [...s.feed, { type: 'user', id: `u${Date.now()}`, text, images }],
        state: 'running',
        activity: 'Thinking',
        turnStartedAt: Date.now(),
        pendingSettings: false,
      }),
      `send to ${id}`,
    );
  },
  stop(id: string) {
    patch(
      id,
      (s) => ({
        state: 'idle',
        activity: 'You stopped',
        feed: [
          ...s.feed,
          {
            type: 'turn-end',
            id: `te${Date.now()}`,
            seconds: Math.round((Date.now() - (s.turnStartedAt ?? Date.now())) / 1000),
            stopped: true,
          },
        ],
        turnStartedAt: undefined,
      }),
      `stop ${id}`,
    );
  },
  answer(id: string, request: Request, outcome: string) {
    patch(
      id,
      (s) => ({
        request: undefined,
        state: 'running',
        activity: 'Working',
        turnStartedAt: s.turnStartedAt ?? Date.now(),
        feed: [
          ...s.feed.map((row) =>
            request.kind === 'permission' && row.type === 'tool' && row.id === request.toolCallId
              ? outcome.startsWith('Allowed')
                ? { ...row, permission: 'allowed' as const }
                : { ...row, permission: 'denied' as const, status: 'done' as const }
              : row,
          ),
          { type: 'request-outcome', id: `ro${Date.now()}`, text: outcome },
        ],
      }),
      `answer ${id}: ${outcome}`,
    );
  },
  create(draft: Pick<Session, 'project' | 'agent' | 'mode' | 'model' | 'effort' | 'checkout'> & { from: string | null }, prompt: string) {
    const id = `s${Date.now()}`;
    const session: Session = {
      ...draft,
      id,
      title: (prompt.split('\n')[0] ?? prompt).slice(0, 60),
      state: 'running',
      unread: false,
      archived: false,
      activity: 'Thinking',
      updatedAt: 'now',
      branch: draft.checkout === 'worktree' ? `argo/session-${id}` : 'main',
      contextUsed: 0.02,
      feed: [{ type: 'user', id: `u${id}`, text: prompt }],
      plan: [],
      changedFiles: [],
      subagents: [],
      shells: [],
      turnStartedAt: Date.now(),
    };
    set({ sessions: [session, ...state.sessions] }, `create ${id} in ${draft.project} (${draft.agent}, ${draft.checkout} from ${draft.from ?? 'main'})`);
    return id;
  },
};

function showToast(text: string) {
  const id = Date.now();
  set({ toast: { id, text } });
  setTimeout(() => {
    if (state.toast?.id === id) set({ toast: undefined });
  }, 2500);
}

export function getSession(id: string) {
  return state.sessions.find((s) => s.id === id);
}

export function useSession(id: string | undefined) {
  return useStore((s) => s.sessions.find((x) => x.id === id));
}

export function catalogFor(agent: Session['agent']) {
  return CATALOG.find((c) => c.id === agent) ?? CATALOG[0]!;
}

// The live Session replays a recorded Turn so streaming on a small screen can be judged.
let tick = 0;
setInterval(() => {
  const live = state.sessions.find((s) => s.id === 'live');
  if (!live || live.state !== 'running') return;
  const step = LIVE_SCRIPT[tick % LIVE_SCRIPT.length]!;
  tick += 1;
  const row: FeedRow = { ...step.row, id: `${step.row.id}-${tick}` } as FeedRow;
  const feed = tick % LIVE_SCRIPT.length === 0 ? live.feed.slice(0, 2) : [...live.feed.map(settle), row];
  patch('live', () => ({ feed, activity: step.activity, unread: true }));
}, 1800);

function settle(row: FeedRow): FeedRow {
  return row.type === 'tool' && row.status === 'running' ? { ...row, status: 'done', seconds: row.seconds ?? 2 } : row;
}
