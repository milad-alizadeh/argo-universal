import { writeLog } from '@repo/machine-log';
import type { PluginService } from './service';

const backgroundStartLimitMs = 30000;

// Only the wait ends at the deadline; the passes carry on starting.
export async function startBackgroundPlugins(
  plugins: PluginService,
  home: string,
): Promise<void> {
  const line = await Promise.race([
    plugins.startBackground().then(
      () => null,
      (cause: unknown) => `Background Plugins failed: ${String(cause)}`,
    ),
    limit(),
  ]);

  if (line) reportBackground(home, line);
}

// Shutdown awaits this operation; even a failed log must not reject it.
function reportBackground(home: string, line: string): void {
  try {
    writeLog({ home, label: 'plugins', line });
  } catch (cause) {
    process.stderr.write(
      `Background Plugins could not be logged: ${String(cause)}\n`,
    );
  }
}

function limit(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve(
          `Background Plugins still starting after ${backgroundStartLimitMs} ms`,
        ),
      backgroundStartLimitMs,
    ).unref();
  });
}
