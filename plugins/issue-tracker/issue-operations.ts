import type { Argo, OperationHandler } from '@argo/plugin-kit';
import type { IssueLink, TrackerStorage } from './tracker-storage';

// What the Operations need of the Plugin: the attachments they store.
export type OperationsSource = {
  storage: Pick<TrackerStorage, 'attachSession' | 'detachSession'>;
};

type Storage = OperationsSource['storage'];

type IssueOperations = {
  attach: OperationHandler<'attach'>;
  detach: OperationHandler<'detach'>;
};

/*
 * The Operations an Agent runs while it works on an Issue (ADR-0044): `argo run issue-tracker.attach
 * --params '{"number":1320}'` connects the calling Session to that Issue, and `detach` disconnects it.
 * Both need a Session and a Project, so core runs them only for a Session and hands each the Project
 * the run names, or else the Session's own.
 */
export const issueOperations = ({
  storage,
}: OperationsSource): IssueOperations => ({
  attach: async (params, caller) => {
    const link = issueLink(params, caller);

    await storage.attachSession(link);

    return { attached: true, ...link };
  },
  detach: async (params, caller) =>
    detached(storage, issueLink(params, caller)),
});

async function detached(
  storage: Storage,
  link: IssueLink,
): Promise<IssueLink & { attached: false }> {
  await storage.detachSession(link);

  return { attached: false, ...link };
}

// What the Operation acts on: the Issue it names, in the Project core resolved, for the calling Session.
const issueLink = (
  { number }: Parameters<IssueOperations['attach']>[0],
  { projectId, sessionId }: Parameters<IssueOperations['attach']>[1],
): IssueLink => ({ projectId, number: issueNumber(number), sessionId });

export function registerIssueOperations(
  argo: Pick<Argo, 'operations'>,
  source: OperationsSource,
): void {
  const { attach, detach } = issueOperations(source);

  argo.operations.register('attach', attach);
  argo.operations.register('detach', detach);
}

// Core checked that it is a number; an Issue number is also a whole number from 1.
function issueNumber(given: number): number {
  if (Number.isSafeInteger(given) && given >= 1) return given;

  throw new Error('number must be a positive Issue number.');
}
