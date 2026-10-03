import { createMachineLog, type MachineLogOptions } from './index';

// The official browser inspector needs a window; native Apps retain the console log.
export function createBrowserMachineInspection(
  options: MachineLogOptions & { inspectEnabled: boolean },
) {
  return { inspect: createMachineLog(options), stop: () => {} };
}
