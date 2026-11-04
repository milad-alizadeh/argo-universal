import { expect, it, vi } from 'vitest';
import type { Sessions } from '../sessions';
import { PluginOperationRouter } from './plugin-run';

const plugin = { id: 'demo:close', pluginId: 'demo', name: 'close' };

function routerOver(run: () => Promise<{ closed: true }>) {
  const operations = { run: vi.fn(run), rows: vi.fn(() => Promise.resolve([])) };
  // Only the registry's `run` and the Sessions a Session's run is recorded on are used by a user's run.
  const router = new PluginOperationRouter(
    { operations },
    Object.create(null) as Sessions,
  );

  return { router, operations };
}

it("runs the user's own Plugin Operation as a person, as a tap does", async () => {
  const { router, operations } = routerOver(() =>
    Promise.resolve({ closed: true }),
  );

  await router.runFor({ kind: 'user' }, plugin, { number: 1 });

  expect(operations.run).toHaveBeenCalledWith(
    expect.objectContaining({ caller: { person: true } }),
  );
});
