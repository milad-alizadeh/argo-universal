import type { Argo } from '@argo/plugin-kit';
import type { Project } from './issue-project';

export type ProjectsRead = { projects?: Project[]; failed?: boolean };

/*
 * The Projects, and which of them each App's section is showing, shared by its one live list and the pages beside it.
 * Opening a page lists nothing: the list loads them, and a page that names a Project asks only when it does not know
 * that one. Every connected App reaches this one store, so the choice is kept per Connection: one App's page never
 * changes the Project another App's list shows.
 */
export type IssueProjects = {
  read: () => ProjectsRead;
  chosenId: (connection: Connection) => string | undefined;
  // The Projects as they are now, sharing a call already on its way.
  refresh: () => Promise<Project[]>;
  // The Projects known already, or the first call for them.
  known: () => Promise<Project[]>;
  choose: (connection: Connection, id: string) => void;
  subscribe: (listener: () => void) => () => void;
};

type List = Argo['projects']['list'];

// The Connection a page's view belongs to; a page opened with none shares the one choice such pages have.
type Connection = string | undefined;

// One call at a time: asking while one is on its way shares it.
function sharedCall<T>(run: () => Promise<T>): () => Promise<T> {
  let call: Promise<T> | undefined;

  return () => {
    call ??= run().finally(() => {
      call = undefined;
    });

    return call;
  };
}

const listed = (list: List, current: ProjectsRead): Promise<ProjectsRead> =>
  list().then(
    (projects) => ({ projects }),
    () => ({ ...current, failed: true }),
  );

type ProjectsReader = Pick<IssueProjects, 'read' | 'refresh' | 'known'>;

function createProjectsRead(list: List, tell: () => void): ProjectsReader {
  let read: ProjectsRead = {};

  const refresh = sharedCall(async () => {
    read = await listed(list, read);
    tell();

    return read.projects ?? [];
  });

  return {
    read: () => read,
    refresh,
    known: () => (read.projects ? Promise.resolve(read.projects) : refresh()),
  };
}

function createProjectChoice(
  tell: () => void,
): Pick<IssueProjects, 'chosenId' | 'choose'> {
  const chosen = new Map<Connection, string>();

  return {
    chosenId: (connection) => chosen.get(connection),
    choose: (connection, id) => {
      if (chosen.get(connection) === id) return;

      chosen.set(connection, id);
      tell();
    },
  };
}

type Listeners = Pick<IssueProjects, 'subscribe'> & { tell: () => void };

function createListeners(): Listeners {
  const listeners = new Set<() => void>();

  return {
    tell: () => {
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function createIssueProjects(list: List): IssueProjects {
  const { tell, subscribe } = createListeners();

  return {
    ...createProjectsRead(list, tell),
    ...createProjectChoice(tell),
    subscribe,
  };
}
