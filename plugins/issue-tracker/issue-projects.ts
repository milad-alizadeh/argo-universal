import type { Argo } from '@argo/plugin-kit';
import type { Project } from './issue-project';
import { createListeners } from './listeners';

export type ProjectsRead = { projects?: Project[]; failed?: boolean };

/*
 * The Projects, and which of them the section is showing, shared by the one live list and the pages beside it. Opening a
 * page lists nothing: the list loads them, and a page that names a Project asks only when it does not know that one.
 */
export type IssueProjects = {
  read: () => ProjectsRead;
  chosenId: () => string | undefined;
  // The Projects as they are now, sharing a call already on its way.
  refresh: () => Promise<Project[]>;
  // The Projects known already, or the first call for them.
  known: () => Promise<Project[]>;
  choose: (id: string) => void;
  subscribe: (listener: () => void) => () => void;
};

type List = Argo['projects']['list'];

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
  let chosen: string | undefined;

  return {
    chosenId: () => chosen,
    choose: (id) => {
      if (id === chosen) return;

      chosen = id;
      tell();
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
