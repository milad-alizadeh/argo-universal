import type { Argo } from '@argo/plugin-kit';
import type { ChangeItem } from './pull-change';
import {
  changesBySession,
  readLinks,
  type ChangesSource,
} from './pull-changes';
import { checkoutIdentity, markCheckout } from './pull-checkout';
import { diffOf, filesOf, type FileSource } from './pull-file-operations';
import { defineFilesReads } from './pull-files';
import {
  attach,
  detach,
  discoverFor,
  list,
  type Scope,
} from './pull-operations';
import { definePullReads } from './pull-reads';
import { createPullStore } from './pull-store';
import { sessionCaller, type SessionCaller } from './session-caller';

function sourceOf(argo: Argo): ChangesSource {
  return {
    store: createPullStore(argo),
    reads: definePullReads(argo),
    readState: argo.queries.readState,
  };
}

// Each Session's Changes, the one on its Checkout's own line of work marked.
async function markedBySession(
  argo: Argo,
  contexts: readonly SessionCaller[],
  answered: Readonly<Record<string, ChangeItem[]>>,
): Promise<Record<string, ChangeItem[]>> {
  const marked = await Promise.all(
    contexts.map(async (context): Promise<[string, ChangeItem[]]> => [
      context.sessionId,
      markCheckout(
        answered[context.sessionId] ?? [],
        await checkoutIdentity(argo, context),
      ),
    ]),
  );

  return Object.fromEntries(marked);
}

function registerChanges(argo: Argo, source: ChangesSource): void {
  // A Session's Changes: its attached pull requests as GitHub reports them (ADR-0052).
  argo.slots.register('argo/session/changes/v1', async ({ contexts }) =>
    markedBySession(
      argo,
      contexts,
      changesBySession(
        await readLinks(
          source,
          contexts.map(({ sessionId }) => sessionId),
        ),
      ),
    ),
  );
}

// What the Operations that store, ask GitHub or tell the App act through.
const scopeOf = (argo: Argo, { store }: ChangesSource): Scope => ({
  ...argo,
  store,
});

function registerFiles(argo: Argo, source: ChangesSource): void {
  const reading: FileSource = {
    ...source,
    files: defineFilesReads(argo),
    read: argo.queries.read,
    scope: scopeOf(argo, source),
  };

  argo.operations.register('files', async (params, caller) =>
    filesOf(reading, params, await sessionCaller(argo, params, caller)),
  );
  argo.operations.register('diff', async (params, caller) =>
    diffOf(reading, params, await sessionCaller(argo, params, caller)),
  );
}

function registerAttach(argo: Argo, source: ChangesSource): void {
  argo.operations.register('attach', async (params, caller) => ({
    attached: true,
    change: await attach(
      scopeOf(argo, source),
      params.reference,
      await sessionCaller(argo, params, caller),
    ),
  }));
}

function registerDetach(argo: Argo, source: ChangesSource): void {
  argo.operations.register('detach', async (params, caller) => ({
    detached: true,
    ...(await detach(
      scopeOf(argo, source),
      params.reference,
      await sessionCaller(argo, params, caller),
    )),
  }));
}

function registerOperations(argo: Argo, source: ChangesSource): void {
  registerAttach(argo, source);
  registerDetach(argo, source);
  argo.operations.register('discover', async (params, caller) =>
    discoverFor(
      scopeOf(argo, source),
      await sessionCaller(argo, params, caller),
    ),
  );
}

// What the Session's pull requests look like now, and the retry that asks GitHub again.
function registerReads(argo: Argo, source: ChangesSource): void {
  argo.operations.register('list', async (params, caller) =>
    list(source, argo, await sessionCaller(argo, params, caller)),
  );
  // Everything the Plugin kept is made due first, so a failed read is read again and what answers is what GitHub says.
  argo.operations.register('refresh', async (params, caller) => {
    argo.changed();

    return list(source, argo, await sessionCaller(argo, params, caller));
  });
}

export function register(argo: Argo): void {
  const source = sourceOf(argo);

  registerOperations(argo, source);
  registerReads(argo, source);
  registerFiles(argo, source);
  registerChanges(argo, source);
}
