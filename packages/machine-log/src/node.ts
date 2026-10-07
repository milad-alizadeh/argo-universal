import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createActor, type InspectionEvent } from 'xstate';
import { createMachineLog } from './index';
import { inspectorMachine } from './inspector-machine';

const defaultInspectorPort = 8080;

export interface NodeMachineLogOptions {
  home: string;
  processName: 'desktop' | 'supervisor' | 'engine';
  development?: boolean;
}

export function createNodeMachineLog(options: NodeMachineLogOptions) {
  const directory = join(options.home, 'logs');
  const file = join(directory, `${options.processName}.machines.jsonl`);
  let directoryCreated = false;
  return createMachineLog({
    enabled:
      options.development !== false &&
      process.env.NODE_ENV !== 'production' &&
      process.env.ARGO_MACHINE_LOG === '1',
    processName: options.processName,
    processId: process.pid,
    writeLine: (line) => {
      if (!directoryCreated) {
        mkdirSync(directory, { recursive: true });
        directoryCreated = true;
      }
      appendFileSync(file, line);
    },
  });
}

export function createNodeMachineInspection(
  options: NodeMachineLogOptions & { inspectorPort?: number },
) {
  const log = createNodeMachineLog(options);
  if (
    options.development === false ||
    process.env.NODE_ENV === 'production' ||
    process.env.ARGO_MACHINE_INSPECT !== '1'
  ) {
    return { inspect: log, stop: () => {} };
  }
  const inspector = createActor(inspectorMachine, {
    input: {
      port: options.inspectorPort ?? defaultInspectorPort,
      processName: options.processName,
      processId: process.pid,
    },
  }).start();
  return {
    inspect: (inspection: InspectionEvent) => {
      log?.(inspection);
      if (inspector.getSnapshot().status === 'active')
        inspector.send({ type: 'inspection.record', inspection });
    },
    stop: () => inspector.stop(),
  };
}
