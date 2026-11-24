import { expect, it } from 'vitest';
import { summarizeProcesses } from './host-load';

it('attributes check workers to checks even when a Session Agent started them', (): void => {
  const processes = [
    '10 1 5.0 100 /Applications/Argo.app/Contents/MacOS/Argo',
    '20 10 10.0 200 /usr/bin/node /work/codex-acp',
    '21 20 15.0 300 /bin/zsh',
    '30 21 20.0 400 node /work/tools/verify.mts',
    '31 30 125.0 500 /usr/bin/node worker',
    '40 1 25.0 600 /usr/bin/unrelated',
  ].join('\n');

  expect(summarizeProcesses(processes, 10)).toEqual({
    argo: { cpuPercent: 5, rssKiB: 100, processes: 1 },
    agents: { cpuPercent: 25, rssKiB: 500, processes: 2 },
    checks: { cpuPercent: 145, rssKiB: 900, processes: 2 },
    other: { cpuPercent: 25, rssKiB: 600, processes: 1 },
    verifyRuns: 1,
  });
});
