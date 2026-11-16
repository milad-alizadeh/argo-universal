import type { Argo } from '@argo/plugin-kit';
import { setAssignee, setPriority } from './issue-edits';
import { getIssue, listIssues } from './issue-lookups';
import { transition } from './issue-transition';

/*
 * The Operations that read and change one Jira issue (ADR-0044), which the issue's page runs and an Agent runs the
 * same way through `argo run`, each for the Project the run names or the caller's own.
 */
type Calls = Pick<Argo, 'fetch' | 'storage' | 'changed' | 'operations'>;

function registerWrites(argo: Calls): void {
  argo.operations.register('transition', (params, { projectId }) =>
    transition(argo, { ...params, projectId }),
  );
  argo.operations.register('setAssignee', (params, { projectId }) =>
    setAssignee(argo, { ...params, projectId }),
  );
  argo.operations.register('setPriority', (params, { projectId }) =>
    setPriority(argo, { ...params, projectId }),
  );
}

function registerLookups(argo: Calls): void {
  argo.operations.register('getIssue', (params, { projectId }) =>
    getIssue(argo, { ...params, projectId }),
  );
  argo.operations.register('listIssues', (params, { projectId }) =>
    listIssues(argo, { ...params, projectId }),
  );
}

export function registerIssueOperations(argo: Calls): void {
  registerWrites(argo);
  registerLookups(argo);
}
