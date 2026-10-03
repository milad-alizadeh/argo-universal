import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createMachineLog } from './index';

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
