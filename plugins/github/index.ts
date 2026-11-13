import type { Argo } from '@argo/plugin-kit';
import {
  changesBySession,
  readLinks,
  type ChangesSource,
} from './pull-changes';
import { diffOf, filesOf, type FileSource } from './pull-file-operations';
import { defineFilesReads } from './pull-files';
import { attach, detach, discoverFor, list, refresh } from './pull-operations';
import { definePullReads } from './pull-reads';
import { createPullStore } from './pull-store';
import { sessionCaller } from './session-caller';

function sourceOf(argo: Argo): ChangesSource {
  return {
    store: createPullStore(argo),
    reads: definePullReads(argo),
    readState: argo.queries.readState,
  };
}

function registerChanges(argo: Argo, source: ChangesSource): void {
  // A Session's Changes: its attached pull requests as GitHub reports them (ADR-0052).
  argo.slots.register('argo/session/changes/v1', async ({ contexts }) =>
    changesBySession(
      await readLinks(
        source,
        contexts.map(({ sessionId }) => sessionId),
      ),
    ),
  );
}

function registerFiles(argo: Argo, source: ChangesSource): void {
  const reading: FileSource = {
    ...source,
    files: defineFilesReads(argo),
    read: argo.queries.read,
    scope: { ...argo, store: source.store },
  };

  argo.operations.register('files', (params, caller) =>
    filesOf(reading, params, sessionCaller(params, caller)),
  );
  argo.operations.register('diff', (params, caller) =>
    diffOf(reading, params, sessionCaller(params, caller)),
  );
}

function registerOperations(argo: Argo, source: ChangesSource): void {
  argo.operations.register('attach', async (params, caller) => ({
    attached: true,
    change: await attach(
      { ...argo, store: source.store },
      params.reference,
      sessionCaller(params, caller),
    ),
  }));
  argo.operations.register('discover', (_params, caller) =>
    discoverFor({ ...argo, store: source.store }, caller),
  );
  argo.operations.register('detach', async (params, caller) => ({
    detached: true,
    ...(await detach(
      { ...argo, store: source.store },
      params.reference,
      sessionCaller(params, caller),
    )),
  }));
}

// What the Session's pull requests look like now, and the retry that asks GitHub again.
function registerReads(argo: Argo, source: ChangesSource): void {
  argo.operations.register('list', (_params, caller) => list(source, caller));
  argo.operations.register('refresh', (_params, caller) =>
    refresh(source, argo, caller),
  );
}

export function register(argo: Argo): void {
  const source = sourceOf(argo);

  registerOperations(argo, source);
  registerReads(argo, source);
  registerFiles(argo, source);
  registerChanges(argo, source);
}
