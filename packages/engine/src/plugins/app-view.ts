import {
  legacyPartVersions,
  type PartVersions,
} from '@repo/contracts/plugins/kit';
import type { ViewMessage } from '@repo/contracts/plugins/wire';
import type { RpcConnection } from '../rpc';
import { compatibleView } from './compatible-view';
import type { OpenView } from './open-view';
import { messages } from './view-stream';

export function appView(
  view: OpenView,
  connection: RpcConnection,
  log: (line: string) => void,
): AsyncGenerator<ViewMessage> {
  const source = messages(view, connection.signal);

  if (view.opening.renderSlot) return source;

  return compatibleView(source, reportedParts(connection), (reason) =>
    log(`Plugin ${view.pluginId}: refused ${view.opening.path}: ${reason}`),
  );
}

const reportedParts = (connection: RpcConnection): PartVersions =>
  connection.surface?.parts ?? legacyPartVersions;
