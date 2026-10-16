import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { runInstallTool } from '@repo/engine/installation-runtime';

const folder = join(
  process.env.ARGO_HOME ?? '',
  'agents',
  'registry',
  'scope',
  '.staging-operation',
);

const script = fileURLToPath(
  new URL(
    '../../../packages/engine/mocks/installation-lifetime.mjs',
    import.meta.url,
  ),
);

const readRecordedDescendants = async (): Promise<string | undefined> => {
  try {
    const ready = await readFile(join(folder, 'ready'), 'utf8');

    return /^\d+,\d+$/.test(ready) ? ready : undefined;
  } catch {
    return undefined;
  }
};

const readReady = async (): Promise<string> => {
  for (;;) {
    const ready = await readRecordedDescendants();

    if (ready) return ready;
    await sleep(25);
  }
};

await mkdir(folder, { recursive: true });

const controller = new AbortController();

process.on('SIGTERM', () => {
  if (process.env.ARGO_FIXTURE_CANCEL_INSTALL)
    controller.abort(new Error('Installation cancelled'));
});

void runInstallTool({
  executable: process.execPath,
  args: [script],
  cwd: folder,
  signal: controller.signal,
}).catch(() => {});

const [installer, descendant] = (await readReady()).split(',').map(Number);

await writeFile(
  process.env.ARGO_FIXTURE_PIDFILE ?? '',
  JSON.stringify({ engine: process.pid, installer, descendant }),
);

process.send?.({ type: 'ready', port: 7337 });

setInterval(() => {}, 1000);
