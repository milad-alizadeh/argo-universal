import type { PluginHostProcess } from './connection';

export function hostCompletion(
  child: PluginHostProcess,
  completed: (reason: string) => void,
): Promise<void> {
  return new Promise((resolve): void => {
    child.once('close', (code, signal) => {
      resolve();
      completed(`${code ?? signal}`);
    });
  });
}
