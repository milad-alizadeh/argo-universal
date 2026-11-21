import type { RunConfiguration } from './run-configurations';
import { urlOf } from './run-ports';
import type { RunRecord } from './run-store';
import type { RunCheckout } from './runs';

export function newRunRecord(
  { projectId, checkoutPath }: RunCheckout,
  configuration: RunConfiguration,
  { id, port, startedAt }: Pick<RunRecord, 'id' | 'port' | 'startedAt'>,
): RunRecord {
  return {
    id,
    projectId,
    checkoutPath,
    pid: null,
    name: configuration.name,
    command: configuration.command,
    cwd: configuration.cwd,
    port,
    url: urlOf(configuration, port),
    status: 'starting',
    exitCode: null,
    startedAt,
    readyAt: null,
    endedAt: null,
    outputBlobId: null,
  };
}
