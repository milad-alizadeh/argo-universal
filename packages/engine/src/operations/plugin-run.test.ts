import { expect, it, vi } from 'vitest';
import type { Sessions } from '../sessions';
import { PluginOperationRouter } from './plugin-run';

const plugin = { id: 'demo:close', pluginId: 'demo', name: 'close' };

function routerOver(run: () => Promise<{ closed: true }>) {
  const operations = {
    run: vi.fn(run),
    rows: vi.fn(() => Promise.resolve([])),
  };
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

const session = { kind: 'session' as const, sessionId: 's1', projectId: 'p1' };

function sessionRouter() {
  const confirm = vi.fn(() => Promise.resolve());
  const call = { confirm, finish: vi.fn(), started: vi.fn() };
  const operations = {
    run: vi.fn(() => Promise.resolve({ closed: true })),
    rows: vi.fn(() =>
      Promise.resolve([{ id: plugin.id, label: 'Close', keywords: [] }]),
    ),
  };
  const sessions = { call: vi.fn(() => call) } as unknown as Sessions;

  return {
    router: new PluginOperationRouter(
      { operations: operations as never },
      sessions,
    ),
    confirm,
    operations,
  };
}

it('hands a Session’s run the way to ask the user, for the Project it names past its own', async () => {
  const { router, operations, confirm } = sessionRouter();

  await router.runFor(session, plugin, { projectId: 'p2' });

  const [{ confirm: ask }] = operations.run.mock.calls[0] as unknown as [
    { confirm: (card: unknown) => Promise<void> },
  ];

  await ask({ title: 'x', description: 'y' });

  expect(confirm).toHaveBeenCalledWith({ title: 'x', description: 'y' });
});
