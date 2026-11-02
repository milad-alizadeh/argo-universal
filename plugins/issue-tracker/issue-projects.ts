import type { Argo } from '@argo/plugin-kit';
import type { Project } from './issue-project';

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

export function createIssueProjects(
  list: Argo['projects']['list'],
): IssueProjects {
  const listeners = new Set<() => void>();
  const tell = (): void => {
    for (const listener of listeners) listener();
  };
  let read: ProjectsRead = {};
  let chosen: string | undefined;
  let call: Promise<Project[]> | undefined;

  const answered = (next: ProjectsRead, projects: Project[]): Project[] => {
    read = next;
    call = undefined;
    tell();

    return projects;
  };

  const refresh = (): Promise<Project[]> => {
    call ??= list().then(
      (projects) => answered({ projects }, projects),
      () => answered({ ...read, failed: true }, read.projects ?? []),
    );

    return call;
  };

  return {
    read: () => read,
    chosenId: () => chosen,
    refresh,
    known: () => (read.projects ? Promise.resolve(read.projects) : refresh()),
    choose: (id) => {
      if (id === chosen) return;
      chosen = id;
      tell();
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
