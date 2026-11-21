import type { Database } from '@repo/db';
import { project, session } from '@repo/db/schema';
import {
  checkoutCleanupRisk,
  removeArchivedCheckout,
  type CheckoutCleanupRisk,
} from '@repo/git';
import { eq } from 'drizzle-orm';
import { readProjectPath } from '../../projects';
import type { WriterActorRef } from '../../storage';
import type { SessionData } from '../session-data';
import { ownsStoredWorktree } from '../session-record';
import type { ArchiveTerminals } from './archive-terminals';
import { keepArchivedCheckout } from './checkout-retention';

type Target = Pick<SessionData, 'projectId' | 'sessionId' | 'checkout'>;

type CleanupOptions = {
  signal?: AbortSignal;
  writer?: WriterActorRef;
  terminals?: ArchiveTerminals;
};

// Approval is bound to the running Engine and the inspected work.
const approvals = new WeakMap<Database, Map<string, string>>();

export function approveCheckoutCleanup(
  database: Database,
  sessionId: string,
  fingerprint?: string,
): void {
  const approved = approvals.get(database) ?? new Map<string, string>();

  if (fingerprint === undefined) approved.delete(sessionId);
  else approved.set(sessionId, fingerprint);
  approvals.set(database, approved);
}

const takeApproval = (
  database: Database,
  sessionId: string,
): string | undefined => {
  const approved = approvals.get(database);
  const fingerprint = approved?.get(sessionId);

  approved?.delete(sessionId);

  return fingerprint;
};

export const projectKeepsCheckout = (
  database: Database,
  projectId: string,
): boolean =>
  database
    .select({ deletes: project.deleteWorktreeOnArchive })
    .from(project)
    .where(eq(project.id, projectId))
    .get()?.deletes === false;

const sessionKeepsCheckout = (database: Database, sessionId: string): boolean =>
  database
    .select({ keep: session.keepCheckout })
    .from(session)
    .where(eq(session.id, sessionId))
    .get()?.keep === true;

export function inspectArchiveCleanup(
  database: Database,
  data: Target,
): Promise<CheckoutCleanupRisk> {
  if (
    !ownsStoredWorktree(database, data.sessionId) ||
    projectKeepsCheckout(database, data.projectId)
  )
    return Promise.resolve({ kind: 'safe' });

  return checkoutCleanupRisk(
    readProjectPath(database, data.projectId),
    data.checkout.path,
  );
}

// A caller can approve only an exact fingerprint. For a clean Checkout Git checks again for new edits.
const canRemove = (risk: CheckoutCleanupRisk, approval?: string): boolean =>
  risk.kind === 'safe' ||
  (risk.kind === 'loss' && risk.fingerprint === approval);

const keepReason = (risk: CheckoutCleanupRisk): string =>
  risk.kind === 'loss'
    ? risk.reason
    : 'Argo could not verify that the Checkout’s work is recoverable.';

async function attemptCleanup(
  database: Database,
  data: Target,
  options: CleanupOptions,
): Promise<void> {
  const approval = takeApproval(database, data.sessionId);
  const projectPath = readProjectPath(database, data.projectId);
  const risk = await checkoutCleanupRisk(projectPath, data.checkout.path);

  if (risk.kind === 'absent') return;

  if (canRemove(risk, approval)) {
    const removal = { signal: options.signal, force: risk.kind === 'loss' };

    const remove = (): Promise<void> =>
      removeArchivedCheckout(projectPath, data.checkout, removal);

    return options.terminals
      ? options.terminals.removeCheckout(
          { projectId: data.projectId, checkoutPath: data.checkout.path },
          remove,
        )
      : remove();
  }

  const target = { sessionId: data.sessionId, reason: keepReason(risk) };

  return keepArchivedCheckout(database, target, options.writer);
}

export async function removeSessionCheckout(
  database: Database,
  data: Target,
  options: CleanupOptions = {},
): Promise<void> {
  if (!mayCleanUp(database, data.sessionId)) return;

  await attemptCleanup(database, data, options).catch((cause: unknown) =>
    cleanupFailed(database, cause, { ...options, sessionId: data.sessionId }),
  );
}

const mayCleanUp = (database: Database, sessionId: string): boolean =>
  ownsStoredWorktree(database, sessionId) &&
  !sessionKeepsCheckout(database, sessionId);

async function cleanupFailed(
  database: Database,
  cause: unknown,
  { sessionId, signal, writer }: CleanupOptions & { sessionId: string },
): Promise<void> {
  if (signal?.aborted) throw cause;

  const retention = {
    sessionId,
    reason: 'Git could not safely remove the Checkout.',
    retry: true as const,
  };

  await keepArchivedCheckout(database, retention, writer);
}
