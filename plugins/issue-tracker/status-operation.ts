import type { Argo } from '@argo/plugin-kit';
import { forgetPages } from './filter-paging';
import type { IssueStatus } from './github-issues';
import { openDepsClient, type Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import { requestOverview } from './overview-requests';

type Params = Readonly<Record<string, string | number | boolean>>;

/*
 * `setStatus` closes or reopens one Issue in a Project (ADR-0044), the write a filter list's row runs
 * (ADR-0050). The other open pages hear of it as they do of the Issue page's own change. The Project's
 * counts start to be read again as the call answers, so the pages it makes stale draw from that read.
 */
export function registerStatusOperation(
  argo: Pick<Argo, 'operations'>,
  deps: IssueDeps,
): void {
  argo.operations.register('setStatus', (params) => setStatus(deps, params));
}

async function setStatus(
  deps: IssueDeps,
  params: Params,
): Promise<{ number: number; status: IssueStatus }> {
  const number = Number(params.number);
  const status = statusOf(params.status);
  const project = await projectOf(deps, params.projectId);
  const client = await openDepsClient({ project, deps });

  await client.setStatus(number, status);
  forgetPages();
  deps.changes.publish(number);
  void requestOverview(deps, project, true).catch(() => null);

  return { number, status };
}

function statusOf(given: Params[string] | undefined): IssueStatus {
  if (given === 'open' || given === 'closed') return given;

  throw new Error('status must be open or closed.');
}

async function projectOf(
  deps: IssueDeps,
  projectId: Params[string] | undefined,
): Promise<Project> {
  const project = (await deps.listProjects()).find(
    ({ id }) => id === projectId,
  );

  if (!project) throw new Error('No Project holds that Issue.');

  return project;
}
