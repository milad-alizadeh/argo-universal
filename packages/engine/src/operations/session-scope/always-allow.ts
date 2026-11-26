import {
  operations,
  type OperationDefinition,
  type OperationId,
} from '@repo/contracts/operations';
import type { GrantKey, OperationGrants } from '../../agent-access';
import type { OperationCard, SessionDirectory } from '../../sessions';
import type { SessionCaller } from '../session-tokens';
import { operationCard } from './rules';

// An asking call, and the Project it acts in.
export type AskingCall = {
  caller: SessionCaller;
  id: OperationId;
  targetProjectId: string;
};

type Sources = { directory: SessionDirectory; grants: OperationGrants };

/*
 * The grant Always allow would record for this call, or null when it may not offer one: the Operation must opt in,
 * and the calling Session's delegation chain must start in the caller's Project, so a Session started from another
 * Project never reaches a grant made here (ADR-0044).
 */
export function grantFor(
  { directory }: Sources,
  { caller, id, targetProjectId }: AskingCall,
): GrantKey | null {
  const definition: OperationDefinition = operations[id];

  if (definition.alwaysAllowable !== true) return null;

  if (rootProject(directory, caller.sessionId) !== caller.projectId)
    return null;

  return { projectId: caller.projectId, operationId: id, targetProjectId };
}

// The Project of the Session that began the caller's delegation chain.
function rootProject(directory: SessionDirectory, sessionId: string): string {
  let session = directory.session(sessionId);

  while (session.startedBySessionId !== null)
    session = directory.session(session.startedBySessionId);

  return session.projectId;
}

// The card states exactly what Always allow would cover.
export function cardFor(
  { grants }: Sources,
  id: OperationId,
  grant: GrantKey | null,
): OperationCard {
  const card = operationCard(id);

  if (grant === null) return card;

  const from = grants.projectName(grant.projectId);
  const into = grants.projectName(grant.targetProjectId);

  return {
    ...card,
    description: `${card.description} Always allow lets Sessions started in ${from} run ${card.title} in ${into} without asking, until you revoke it in Settings › Agent access.`,
    alwaysAllow: true,
  };
}

// A grant that cannot be written leaves the call allowed this once.
export async function record(
  { grants }: Sources,
  grant: GrantKey,
): Promise<void> {
  try {
    await grants.grant(grant);
  } catch (cause) {
    console.warn(
      `Always allow for ${grant.operationId} was not recorded, so it was allowed once`,
      cause,
    );
  }
}
