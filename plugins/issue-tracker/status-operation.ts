import type { Argo, OperationHandler } from '@argo/plugin-kit';
import { openDepsClient, projectById, type Project } from './issue-client';
import type { IssueDeps } from './issue-deps';

/*
 * `setStatus` closes or reopens one Issue in a Project (ADR-0044), the write a filter list's row runs
 * (ADR-0050). The other open pages hear of it as they do of the Issue page's own change, which also
 * reads the Projects' counts again for the pages it makes stale.
 */
export function registerStatusOperation(
  argo: Pick<Argo, 'operations'>,
  deps: IssueDeps,
): void {
  argo.operations.register('setStatus', setStatus(deps));
  // Any Operation that runs makes Argo's kept answers due, so the page that ran it reads again.
  argo.operations.register('checkAgain', () => ({}));
}

const setStatus =
  (deps: IssueDeps): OperationHandler<'setStatus'> =>
  async ({ number, status }, { projectId }) => {
    const project = await projectOf(deps, projectId);
    const client = await openDepsClient({ project, deps });

    await client.setStatus(number, status);
    deps.changes.publish(number);

    return { number, status };
  };

async function projectOf(deps: IssueDeps, projectId: string): Promise<Project> {
  const project = await projectById(deps.listProjects, projectId);

  if (!project) throw new Error('No Project holds that Issue.');

  return project;
}
