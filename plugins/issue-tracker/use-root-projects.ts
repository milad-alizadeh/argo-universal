import { useState } from '@argo/plugin-kit';
import type { Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import { useProjects } from './use-projects';

export type RootProjects = {
  projects: Project[];
  project: Project | undefined;
  message: string;
};

export function useRootProjects(
  deps: IssueDeps,
  selected?: Project,
): RootProjects {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [message, setMessage] = useState('Loading Projects…');

  useProjects(deps.listProjects, { setProjects, setProjectId, setMessage });

  return {
    projects,
    project: selected ?? projects.find((row) => row.id === projectId),
    message,
  };
}
