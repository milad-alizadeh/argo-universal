import { describe, expect, it } from 'vitest';
import { createMockAdapter } from './adapter';
import { createAppFixtureAdapters } from './app-fixtures';

describe('shared app fixtures', (): void => {
  it('connects without starting the registered provider', async (): Promise<void> => {
    const provider = createMockAdapter({
      connect: (): never => {
        throw new Error('Provider session started');
      },
    });
    const [adapter] = createAppFixtureAdapters([provider]);
    const session = await adapter?.connect(
      {
        sessionId: 'session-1',
        cwd: '/project',
        vendorSessionId: null,
        configOptions: [],
      },
      {
        message: (): void => {},
        event: (): void => {},
        failed: (error): never => {
          throw error;
        },
      },
      new AbortController().signal,
    );
    expect(session?.ready.vendorSessionId).toBe('fixture-session-1');
    await session?.stop();
  });
  it('uses registered metadata without calling the provider probe', async (): Promise<void> => {
    const provider = {
      ...createMockAdapter({
        probe: (): never => {
          throw new Error('Provider probe started');
        },
      }),
      label: 'Registered Agent',
      logo: '<svg/>',
    };
    const [adapter] = createAppFixtureAdapters([provider]);
    expect(await adapter?.probe(new AbortController().signal)).toEqual({
      availability: 'available',
      configOptions: [],
    });
    expect(adapter).toMatchObject({
      label: 'Registered Agent',
      logo: '<svg/>',
    });
  });
});
