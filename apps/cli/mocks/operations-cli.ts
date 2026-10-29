import { startEngineTestHost } from '@repo/engine/mocks';
import { writeServerAddress } from '@repo/engine/server-runtime';

export async function startCliHost(): Promise<
  Awaited<ReturnType<typeof startEngineTestHost>>
> {
  const host = await startEngineTestHost();
  writeServerAddress(host.home, {
    pid: process.pid,
    port: Number(new URL(host.url).port),
    version: '1.2.3',
    startedAt: '2026-10-03T00:00:00.000Z',
  });

  return host;
}
