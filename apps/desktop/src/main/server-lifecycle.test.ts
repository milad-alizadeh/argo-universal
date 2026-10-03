import type { ServerAddress } from '@repo/contracts';
import { describe, expect, it, vi } from 'vitest';
import {
  createServerLifecycle,
  type ServerLifecycleDependencies,
} from './server-lifecycle';

const runningAddress: ServerAddress = {
  pid: 100,
  port: 7337,
  version: '1.0.0',
  startedAt: '2026-10-03T09:00:00.000Z',
};
const startedAddress: ServerAddress = {
  pid: 200,
  port: 7337,
  version: '1.0.0',
  startedAt: '2026-10-03T10:00:00.000Z',
};

function fakeDependencies(
  overrides: Partial<ServerLifecycleDependencies> = {},
): ServerLifecycleDependencies {
  return {
    version: '1.0.0',
    readAddress: vi.fn(async () => runningAddress),
    readHealth: vi.fn(async () => ({ version: '1.0.0' })),
    start: vi.fn(async () => startedAddress),
    stop: vi.fn(async () => {}),
    ...overrides,
  };
}

describe('createServerLifecycle', () => {
  it('reuses a running Server with the same version', async () => {
    const dependencies = fakeDependencies();
    const lifecycle = createServerLifecycle(dependencies);

    await expect(lifecycle.connect()).resolves.toEqual(runningAddress);
    expect(dependencies.readHealth).toHaveBeenCalledWith(7337);
    expect(dependencies.start).not.toHaveBeenCalled();
    expect(dependencies.stop).not.toHaveBeenCalled();
  });

  it('restarts a running Server with a different version', async () => {
    const dependencies = fakeDependencies({
      readHealth: vi.fn(async () => ({ version: '0.9.0' })),
    });
    const lifecycle = createServerLifecycle(dependencies);

    await expect(lifecycle.connect()).resolves.toEqual(startedAddress);
    expect(dependencies.stop).toHaveBeenCalledWith(runningAddress.pid);
    expect(dependencies.start).toHaveBeenCalledOnce();
    expect(
      vi.mocked(dependencies.stop).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(dependencies.start).mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('starts a Server when there is no server.json', async () => {
    const dependencies = fakeDependencies({
      readAddress: vi.fn(async () => null),
    });
    const lifecycle = createServerLifecycle(dependencies);

    await expect(lifecycle.connect()).resolves.toEqual(startedAddress);
    expect(dependencies.readHealth).not.toHaveBeenCalled();
    expect(dependencies.stop).not.toHaveBeenCalled();
  });

  it('starts a Server when the one in server.json does not answer', async () => {
    const dependencies = fakeDependencies({
      readHealth: vi.fn(async () => null),
    });
    const lifecycle = createServerLifecycle(dependencies);

    await expect(lifecycle.connect()).resolves.toEqual(startedAddress);
    expect(dependencies.stop).not.toHaveBeenCalled();
    expect(dependencies.start).toHaveBeenCalledOnce();
  });

  it('stops on release the Server it started', async () => {
    const dependencies = fakeDependencies({
      readAddress: vi.fn(async () => null),
    });
    const lifecycle = createServerLifecycle(dependencies);
    await lifecycle.connect();

    await lifecycle.release();
    expect(dependencies.stop).toHaveBeenCalledExactlyOnceWith(
      startedAddress.pid,
    );
  });

  it('stops on release the Server it restarted', async () => {
    const dependencies = fakeDependencies({
      readHealth: vi.fn(async () => ({ version: '0.9.0' })),
    });
    const lifecycle = createServerLifecycle(dependencies);
    await lifecycle.connect();
    vi.mocked(dependencies.stop).mockClear();

    await lifecycle.release();
    expect(dependencies.stop).toHaveBeenCalledExactlyOnceWith(
      startedAddress.pid,
    );
  });

  it('leaves a reused Server running on release', async () => {
    const dependencies = fakeDependencies();
    const lifecycle = createServerLifecycle(dependencies);
    await lifecycle.connect();

    await lifecycle.release();
    expect(dependencies.stop).not.toHaveBeenCalled();
  });

  it('stops the Server it started only once', async () => {
    const dependencies = fakeDependencies({
      readAddress: vi.fn(async () => null),
    });
    const lifecycle = createServerLifecycle(dependencies);
    await lifecycle.connect();

    await Promise.all([lifecycle.release(), lifecycle.release()]);
    expect(dependencies.stop).toHaveBeenCalledOnce();
  });
});
