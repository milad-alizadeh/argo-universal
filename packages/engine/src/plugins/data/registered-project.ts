import type { PluginDataState } from '@repo/contracts/plugins/argo-calls';
import { CapabilityRefusal } from '../access/capability-refusal';

const unavailable = 'Project is unavailable';

export const refusedProject: PluginDataState = {
  error: `Refused: ${unavailable}`,
  errorKind: 'refused',
  stale: false,
  revision: 0,
};

type Projects = { projectInfo: () => Promise<{ id: string }[]> };

// A call or a Query may name a Project, which must be one of those registered (ADR-0037).
export async function projectRegistered(
  source: Projects,
  projectId: string | undefined,
): Promise<boolean> {
  if (projectId === undefined) return true;

  const projects = await source.projectInfo();

  return projects.some(({ id }) => id === projectId);
}

export async function requireRegisteredProject(
  source: Projects,
  projectId: string,
): Promise<void> {
  if (!(await projectRegistered(source, projectId)))
    throw new CapabilityRefusal(unavailable);
}
