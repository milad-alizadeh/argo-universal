import { createBrowserInspector } from '@statelyai/inspect';
import type { InspectionEvent } from 'xstate';
import {
  cleanInspection,
  createMachineLog,
  inspectorOptions,
  type MachineLogOptions,
} from './index';

export function createBrowserMachineInspection(
  options: MachineLogOptions & { inspectEnabled: boolean },
) {
  const log = createMachineLog(options);
  if (!options.inspectEnabled || typeof window === 'undefined')
    return { inspect: log, stop: () => {} };
  const inspector = createBrowserInspector(inspectorOptions);
  return {
    inspect: (inspection: InspectionEvent) => {
      log?.(inspection);
      inspector.inspect.next?.(cleanInspection(inspection));
    },
    stop: () => inspector.stop(),
  };
}
