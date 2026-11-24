import {
  mkdir,
  mkdtemp,
  rm,
  stat,
  truncate,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished, vi } from 'vitest';
import { startLoadRecorder } from './load-recorder';

it('rotates a full load log on the next snapshot', async (): Promise<void> => {
  const home = await mkdtemp(join(tmpdir(), 'argo-load-recorder-'));
  const logs = join(home, 'logs');
  const active = join(logs, 'load.log');
  const fullSize = 2_097_152;

  await mkdir(logs);
  await writeFile(active, 'old log');
  await truncate(active, fullSize);

  const recorder = startLoadRecorder(home);

  onTestFinished(async (): Promise<void> => {
    recorder.stop();
    await rm(home, { recursive: true, force: true });
  });

  recorder.record('missed-heartbeat');

  await vi.waitFor(async (): Promise<void> => {
    expect((await stat(join(logs, 'load.log.1'))).size).toBe(fullSize);
  });
});
