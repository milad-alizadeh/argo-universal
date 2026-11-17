import type { Argo } from '@argo/plugin-kit';
import { createAutoArchive } from './pull-auto-archive';
import { createAutoFix } from './pull-auto-fix';
import { defineAutomationReads } from './pull-automation-reads';
import type { ChangeItem } from './pull-change';
import { changesBySession, type ChangesSource } from './pull-changes';
import { checkoutIdentity, markCheckout } from './pull-checkout';
import { defineCommentsReads } from './pull-comments';
import { keptShown } from './pull-kept';
import { linkMarks, markedLinks } from './pull-link-marks';
import { definePullReads } from './pull-reads';
import { createPullRecords } from './pull-records';
import {
  registerFiles,
  registerOperations,
  registerReads,
  type Parts,
} from './pull-register';
import { rowItemsBySession } from './pull-row-items';
import { createPullStore } from './pull-store';
import { createPulls, type Pulls } from './pull-sync';
import { defineViewerReads } from './pull-viewer';
import { watchProject } from './pull-watch';
import type { SessionCaller } from './session-caller';

function sourceOf(argo: Argo): ChangesSource {
  return {
    store: createPullStore(argo),
    automations: { fix: createAutoFix(argo), archive: createAutoArchive(argo) },
    records: createPullRecords(argo),
    reads: {
      ...definePullReads(argo),
      ...defineAutomationReads(argo),
      ...defineCommentsReads(argo),
      ...defineViewerReads(argo),
    },
    readState: argo.queries.readState,
  };
}

// The pull requests the Sessions a Slot asks about are associated with.
const linksOf = (
  { store }: ChangesSource,
  contexts: readonly { sessionId: string }[],
): ReturnType<ChangesSource['store']['forSessions']> =>
  store.forSessions(contexts.map(({ sessionId }) => sessionId));

async function markedOne(
  argo: Argo,
  context: SessionCaller,
  changes: readonly ChangeItem[],
): Promise<[string, ChangeItem[]]> {
  return [
    context.sessionId,
    markCheckout(changes, await checkoutIdentity(argo, context)),
  ];
}

// Each Session's Changes, the one on its Checkout's own line of work marked.
async function markedBySession(
  argo: Argo,
  contexts: readonly SessionCaller[],
  answered: Readonly<Record<string, ChangeItem[]>>,
): Promise<Record<string, ChangeItem[]>> {
  return Object.fromEntries(
    await Promise.all(
      contexts.map((context) =>
        markedOne(argo, context, answered[context.sessionId] ?? []),
      ),
    ),
  );
}

// Each Session's Changes: its attached pull requests as they were last read, beside what the automations keep.
const changesOf = async (
  { source }: Parts,
  shown: ReturnType<Pulls['slot']>,
  contexts: readonly SessionCaller[],
): Promise<Readonly<Record<string, ChangeItem[]>>> =>
  changesBySession(
    await keptShown(
      source,
      contexts.map(({ sessionId }) => sessionId),
      shown,
    ),
  );

function registerChanges(argo: Argo, parts: Parts): void {
  const shown = parts.pulls.slot();

  // A Session's Changes, with GitHub asked behind the answer (ADR-0052).
  argo.slots.register('argo/session/changes/v1', async ({ contexts }) =>
    markedBySession(argo, contexts, await changesOf(parts, shown, contexts)),
  );
}

// The state beside a link to a pull request, attached to a Session or not, from the record the row and the Changes read.
function registerLinkMarks(argo: Argo, pulls: Pulls): void {
  const shown = pulls.slot();

  argo.slots.register('argo/link/mark/v1', async ({ contexts }) =>
    linkMarks(await shown(markedLinks(contexts))),
  );
}

function registerRowItems(argo: Argo, { source, pulls }: Parts): void {
  const shown = pulls.slot();

  // The pull requests of a Session on its row, before the Issues (ADR-0035), from the record the Changes read too.
  argo.slots.register('argo/session/row/v1', async ({ contexts }) =>
    rowItemsBySession(await shown(await linksOf(source, contexts))),
  );
}

// The Watch runs on Argo's clock for each Project with no App open (ADR-0055); each automation takes its turn in it.
function registerWatch(argo: Argo, { source, pulls }: Parts): void {
  const fresh = { pulls, changed: pulls.changed };

  argo.watch.define('/', async ({ context: { projectId } }) => {
    if (projectId) await watchProject(source.automations, fresh, projectId);
  });
}

export function register(argo: Argo): void {
  const source = sourceOf(argo);

  const pulls = createPulls(source, () => argo.changed());

  registerOperations(argo, { source, pulls });
  registerReads(argo, pulls);
  registerFiles(argo, { source, pulls });
  registerChanges(argo, { source, pulls });
  registerRowItems(argo, { source, pulls });
  registerLinkMarks(argo, pulls);
  registerWatch(argo, { source, pulls });
}
