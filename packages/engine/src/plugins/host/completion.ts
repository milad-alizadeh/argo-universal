import { runtimeStartupLimitMs } from '../protocol/runtime-limits';
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

export function monitorStartup(child: PluginHostProcess): void {
  const deadline = setTimeout(
    () => child.kill('SIGKILL'),
    runtimeStartupLimitMs,
  );

  child.once('message', () => clearTimeout(deadline));
  child.once('close', () => clearTimeout(deadline));
}
