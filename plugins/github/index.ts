import type { Argo } from '@argo/plugin-kit';
import {
  changesBySession,
  readLinks,
  type ChangesSource,
} from './pull-changes';
import { attach, list, refresh } from './pull-operations';
import { definePullReads } from './pull-reads';
import { createPullStore } from './pull-store';

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

function registerOperations(argo: Argo, source: ChangesSource): void {
  argo.operations.register('attach', async ({ reference }, caller) => ({
    attached: true,
    change: await attach({ ...argo, store: source.store }, reference, caller),
  }));
  argo.operations.register('list', (_params, caller) => list(source, caller));
  argo.operations.register('refresh', (_params, caller) =>
    refresh(source, argo, caller),
  );
}

export function register(argo: Argo): void {
  const source = sourceOf(argo);

  registerOperations(argo, source);
  registerChanges(argo, source);
}
