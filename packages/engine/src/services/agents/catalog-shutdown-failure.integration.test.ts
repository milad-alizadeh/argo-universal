import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

it('keeps shutdown pending and SQLite owned when the final interruption cannot commit', async () => {
  const response = Promise.withResolvers<unknown>();
  const fetchAgents = vi.fn<() => Promise<unknown>>(() => response.promise);
  const host = await startEngineTestHost({ fetchAgents });
  const refresh = host.caller.agents
    .syncCatalog()
    .catch((error: unknown) => error);
  await vi.waitFor(() => expect(fetchAgents).toHaveBeenCalledTimes(1));
  host.database.$client.exec(
    "CREATE TEMP TRIGGER reject_outcome BEFORE UPDATE ON agent_catalog_sync_request BEGIN SELECT RAISE(ABORT, 'sync outcome storage failed'); END",
  );
  let stopSettled = false;
  const stopping = host
    .stop()
    .finally(() => {
      stopSettled = true;
    })
    .catch((error: unknown) => error);
  try {
    await vi.waitFor(() =>
      expect(
        readFileSync(join(host.home, 'logs', 'engine.log'), 'utf8'),
      ).toContain('Catalog interruption could not commit'),
    );
    expect(stopSettled).toBe(false);
    expect(host.database.$client.isOpen).toBe(true);
    expect(
      host.database.$client
        .prepare('SELECT status FROM agent_catalog_sync_request')
        .all(),
    ).toEqual([{ status: 'pending' }]);
    expect(await refresh).toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
  } finally {
    host.engine.stop();
    host.database.$client.close();
    await stopping;
  }
});
