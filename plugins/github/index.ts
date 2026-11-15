import type { Argo } from '@argo/plugin-kit';
import type { ChangeItem } from './pull-change';
import { changesBySession, type ChangesSource } from './pull-changes';
import { checkoutIdentity, markCheckout } from './pull-checkout';
import { diffOf, filesOf, type FileSource } from './pull-file-operations';
import { defineFilesReads } from './pull-files';
import { linkMarks, markedLinks } from './pull-link-marks';
import {
  attach,
  detach,
  discoverFor,
  discoverUnlessAttached,
  list,
  type Scope,
} from './pull-operations';
import { definePullReads } from './pull-reads';
import { createPullRecords } from './pull-records';
import { rowItemsBySession } from './pull-row-items';
import { createPullStore } from './pull-store';
import { createPulls, type Pulls } from './pull-sync';
import { sessionCaller, type SessionCaller } from './session-caller';

function sourceOf(argo: Argo): ChangesSource {
  return {
    store: createPullStore(argo),
    records: createPullRecords(argo),
    reads: definePullReads(argo),
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

function registerChanges(argo: Argo, { source, pulls }: Parts): void {
  const shown = pulls.slot();

  // A Session's Changes: its attached pull requests as they were last read (ADR-0052), with GitHub asked behind the answer.
  argo.slots.register('argo/session/changes/v1', async ({ contexts }) =>
    markedBySession(
      argo,
      contexts,
      changesBySession(await shown(await linksOf(source, contexts))),
    ),
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

// What the Operations that store, ask GitHub or tell the App act through.
const scopeOf = (
  argo: Argo,
  { store, records }: ChangesSource,
  { sync, changed }: Pulls,
): Scope => ({ ...argo, store, records, sync, changed });

type Parts = { source: ChangesSource; pulls: Pulls };

function registerFiles(argo: Argo, { source, pulls }: Parts): void {
  const reading: FileSource = {
    ...source,
    files: defineFilesReads(argo),
    read: argo.queries.read,
    scope: scopeOf(argo, source, pulls),
  };

  argo.operations.register('files', async (params, caller) =>
    filesOf(reading, params, await sessionCaller(argo, params, caller)),
  );
  argo.operations.register('diff', async (params, caller) =>
    diffOf(reading, params, await sessionCaller(argo, params, caller)),
  );
}

function registerAttach(argo: Argo, { source, pulls }: Parts): void {
  argo.operations.register('attach', async (params, caller) => ({
    attached: true,
    change: await attach(
      scopeOf(argo, source, pulls),
      params.reference,
      await sessionCaller(argo, params, caller),
    ),
  }));
}

function registerDetach(argo: Argo, { source, pulls }: Parts): void {
  argo.operations.register('detach', async (params, caller) => ({
    detached: true,
    ...(await detach(
      scopeOf(argo, source, pulls),
      params.reference,
      await sessionCaller(argo, params, caller),
    )),
  }));
}

function registerOperations(argo: Argo, { source, pulls }: Parts): void {
  registerAttach(argo, { source, pulls });
  registerDetach(argo, { source, pulls });
  argo.operations.register('discover', async (params, caller) =>
    (params.unlessAttached === true ? discoverUnlessAttached : discoverFor)(
      scopeOf(argo, source, pulls),
      await sessionCaller(argo, params, caller),
    ),
  );
}

// What the Session's pull requests look like now, and the retry that asks GitHub again.
function registerReads(argo: Argo, pulls: Pulls): void {
  argo.operations.register('list', async (params, caller) =>
    list(pulls, argo, await sessionCaller(argo, params, caller)),
  );
  // Everything the Plugin kept is made due first, so a failed read is read again and what answers is what GitHub says.
  argo.operations.register('refresh', async (params, caller) => {
    argo.changed();

    return list(pulls, argo, await sessionCaller(argo, params, caller));
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
}
