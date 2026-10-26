import { useEffect, type Argo } from '@argo/plugin-kit';
import type { Project } from './issue-client';

type Setter<Value> = (value: Value) => void;

export type ProjectSetters = {
  setProjects: Setter<Project[]>;
  setProjectId: Setter<string | null>;
  setMessage: Setter<string>;
};

// Loads the Projects once and opens the first.
export function useProjects(
  load: Argo['projects']['list'],
  { setProjects, setProjectId, setMessage }: ProjectSetters,
): void {
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
