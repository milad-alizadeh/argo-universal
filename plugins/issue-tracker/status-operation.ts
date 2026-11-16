import type { Argo, OperationHandler } from '@argo/plugin-kit';
import type { IssueEdit } from './github-edits';
import { openDepsClient, projectById, type Project } from './issue-client';
import type { IssueDeps } from './issue-deps';

/*
 * `setStatus` closes or reopens one Issue in a Project (ADR-0044), the write a filter list's row runs
 * (ADR-0050). The other open pages hear of it as they do of the Issue page's own change, which also
 * reads the Projects' counts again for the pages it makes stale.
 */
export function registerStatusOperation(
  argo: Pick<Argo, 'operations' | 'changed'>,
  deps: IssueDeps,
): void {
  argo.operations.register('setStatus', setStatus(deps));
  argo.operations.register('setLabel', setLabel(deps));
  argo.operations.register('createLabel', createLabel(deps));
  argo.operations.register('setAssignee', setAssignee(deps));
  // Says the Plugin's answers may have changed, so the pages read again; the page that ran it draws the new ones.
  argo.operations.register('checkAgain', () => {
    argo.changed();

    return {};
  });
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

// Each edit's Operation names the Issue and what to put on it; the run is the same as a status change's.
async function runEdit(
  deps: IssueDeps,
  { projectId, number }: { projectId: string; number: number },
  edit: IssueEdit,
): Promise<{ number: number }> {
  const project = await projectOf(deps, projectId);
  const client = await openDepsClient({ project, deps });

  await client.edit(number, edit);
  deps.changes.publish(number);

  return { number };
}

const setLabel =
  (deps: IssueDeps): OperationHandler<'setLabel'> =>
  ({ number, label, on }, { projectId }) =>
    runEdit(deps, { projectId, number }, { kind: 'label', name: label, on });

const createLabel =
  (deps: IssueDeps): OperationHandler<'createLabel'> =>
  ({ number, name }, { projectId }) =>
    runEdit(deps, { projectId, number }, { kind: 'new-label', name });

const setAssignee =
  (deps: IssueDeps): OperationHandler<'setAssignee'> =>
  ({ number, assignee, on }, { projectId }) =>
    runEdit(
      deps,
      { projectId, number },
      { kind: 'assignee', login: assignee, on },
    );

async function projectOf(deps: IssueDeps, projectId: string): Promise<Project> {
  const project = await projectById(deps.listProjects, projectId);

  if (!project) throw new Error('No Project holds that Issue.');

  return project;
}
