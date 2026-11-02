import type { PluginDataState } from '@repo/contracts/plugins/argo-calls';

export const refusedProject: PluginDataState = {
  error: 'Refused: Project is unavailable',
  stale: false,
  revision: 0,
};

// A Query may name a Project, which must be one of those registered (ADR-0037).
export async function projectRegistered(
  source: { projectInfo: () => Promise<{ id: string }[]> },
  projectId: string | undefined,
): Promise<boolean> {
  if (projectId === undefined) return true;

  const projects = await source.projectInfo();

  return projects.some(({ id }) => id === projectId);
}
