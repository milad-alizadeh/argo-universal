import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { keepResult, keptResults } from './kept-results.mts';

const sidebar = 'sidebar at 1x CPU';

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'argo-kept-'));
  vi.stubEnv('PERF_OUT', directory);
  vi.stubEnv('PERF_RUN_ID', 'run');
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

describe('results kept across worker restarts', () => {
  it('returns what an earlier worker kept alongside what a later one kept', async () => {
    await keepResult('frames', sidebar, { interaction: 'sidebar' });
    await keepResult('frames', 'sessions at 1x CPU', {
      interaction: 'sessions',
    });
    // The second worker starts with empty memory and keeps one more.
    await keepResult('frames', 'feed at 1x CPU', { interaction: 'feed' });

    expect(await keptResults('frames')).toEqual([
      { interaction: 'feed' },
      { interaction: 'sessions' },
      { interaction: 'sidebar' },
    ]);
  });

  it('keeps one result for a scenario measured twice', async () => {
    await keepResult('frames', sidebar, { fps: 1 });
    await keepResult('frames', sidebar, { fps: 2 });

    expect(await keptResults('frames')).toEqual([{ fps: 2 }]);
  });

  it('starts a different suite with nothing', async () => {
    await keepResult('frames', sidebar, { fps: 1 });

    expect(await keptResults('agents')).toEqual([]);
  });

  it('starts a new run with nothing', async () => {
    await keepResult('frames', sidebar, { fps: 1 });
    vi.stubEnv('PERF_RUN_ID', 'next');
    expect(await keptResults('frames')).toEqual([]);
  });
});
