import type { Argo } from '@argo/plugin-kit';
import { setAutomation } from './pull-automation-set';
import type { ChangesSource } from './pull-changes';
import { diffOf, filesOf, type FileSource } from './pull-file-operations';
import { defineFilesReads } from './pull-files';
import {
  attach,
  detach,
  discoverFor,
  discoverUnlessAttached,
  list,
  type Scope,
} from './pull-operations';
import type { Pulls } from './pull-sync';
import { sessionCaller } from './session-caller';

// What the Operations that store, ask GitHub or tell the App act through.
const scopeOf = (
  argo: Argo,
  { store, records, automations }: ChangesSource,
  { sync, changed }: Pulls,
): Scope => ({ ...argo, store, records, automations, sync, changed });

export type Parts = { source: ChangesSource; pulls: Pulls };

export function registerFiles(argo: Argo, { source, pulls }: Parts): void {
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

function registerAutomation(argo: Argo, { source, pulls }: Parts): void {
  argo.operations.register('automationSet', async (params, caller) =>
    setAutomation(
      scopeOf(argo, source, pulls),
      params,
      await sessionCaller(argo, params, caller),
    ),
  );
}

export function registerOperations(argo: Argo, { source, pulls }: Parts): void {
  registerAttach(argo, { source, pulls });
  registerAutomation(argo, { source, pulls });
  registerDetach(argo, { source, pulls });
  argo.operations.register('discover', async (params, caller) =>
    (params.unlessAttached === true ? discoverUnlessAttached : discoverFor)(
      scopeOf(argo, source, pulls),
      await sessionCaller(argo, params, caller),
    ),
  );
}

// What the Session's pull requests look like now, and the retry that asks GitHub again.
export function registerReads(argo: Argo, pulls: Pulls): void {
  argo.operations.register('list', async (params, caller) =>
    list(pulls, argo, await sessionCaller(argo, params, caller)),
  );
  // Everything the Plugin kept is made due first, so a failed read is read again and what answers is what GitHub says.
  argo.operations.register('refresh', async (params, caller) => {
    argo.changed();

    return list(pulls, argo, await sessionCaller(argo, params, caller));
  });
}
