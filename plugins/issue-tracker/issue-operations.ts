import type { Argo } from '@argo/plugin-kit';
import type { IssueLink, TrackerStorage } from './tracker-storage';

type Caller = { sessionId?: string; projectId?: string };

type Params = Readonly<Record<string, string | number | boolean>>;

// What the Operations need of the Plugin: the attachments, and `argo.operations` to register on.
export type OperationsSource = {
  storage: Pick<TrackerStorage, 'attachSession' | 'detachSession'>;
};

export type OperationsArgo = Pick<Argo, 'operations'>;

/*
 * The Operations an Agent runs while it works on an Issue (ADR-0044): `argo run issue-tracker.attach
 * --params '{"number":1320}'` connects the calling Session to that Issue, and `detach` disconnects it.
 * Core hands each handler the Session that ran it, so neither takes a Session id of its own.
 */
export function registerIssueOperations(
  argo: OperationsArgo,
  { storage }: OperationsSource,
): void {
  argo.operations.register('attach', async (params, caller) => {
    const link = issueLink(params, caller);

    await storage.attachSession(link);

    return { attached: true, ...link };
  });

  argo.operations.register('detach', async (params, caller) => {
    const link = issueLink(params, caller);

    await storage.detachSession(link);

    return { attached: false, ...link };
  });
}

// What the Operation acts on: the Issue it names, in the caller's own Project, for the calling Session.
function issueLink(params: Params, caller: Caller): IssueLink {
  const sessionId = requireSession(caller);

  return {
    projectId: requireProject(params, caller),
    number: requireNumber(params.number),
    sessionId,
  };
}

function requireSession({ sessionId }: Caller): string {
  if (!sessionId)
    throw new Error('Only a Session can attach an Issue to itself.');

  return sessionId;
}

// A Session works in one Project; a run from outside one names the Project itself.
function requireProject(params: Params, caller: Caller): string {
  return namedProject(params.projectId ?? caller.projectId);
}

const namedProject = (given: Params[string] | undefined): string => {
  if (typeof given === 'string' && given.length > 0) return given;

  throw new Error('No Project to attach the Issue in.');
};

// Core checked the param against the Operation's declared `number` type before the handler saw it.
function requireNumber(given: Params[string] | undefined): number {
  if (Number.isSafeInteger(given) && Number(given) >= 1) return Number(given);

  throw new Error('number must be a positive Issue number.');
}
