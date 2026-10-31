import { describe, expect, it, vi } from 'vitest';
import {
  type TestConnection,
  testConnection,
  testServerUrl,
} from './server-connections.mocks';
import { ServerStatesStore } from './server-states-store';

const ownId = 'server-device';

const studioKey = 'studio-key';

interface Watched {
  states: ServerStatesStore;
  changed: ReturnType<typeof vi.fn>;
  stop: () => void;
}

// The list, reading each Server's state as a mounted Servers page reads it.
function watching(connections: ReadonlyMap<string, TestConnection>): Watched {
  const states = new ServerStatesStore(connections);
  const changed = vi.fn<() => void>();

  return { states, changed, stop: states.subscribe(changed) };
}

describe("each Server's own state", () => {
  it('is read from that Server alone, so one unreachable Server says nothing about the next', () => {
    const own = testConnection(testServerUrl('this-device.local'));
    const studio = testConnection(testServerUrl('studio.local'));

    const { states, changed, stop } = watching(
      new Map([
        [ownId, own],
        [studioKey, studio],
      ]),
    );

    studio.lose();

    expect(changed).toHaveBeenCalled();
    expect(states.getSnapshot().get(ownId)).toBe('connected');
    expect(states.getSnapshot().get(studioKey)).toBe('unreachable');
    stop();
  });

  it('is absent for a Server no Connection was opened to, which reads as unreachable', () => {
    const { states, stop } = watching(
      new Map([[ownId, testConnection(testServerUrl('this-device.local'))]]),
    );

    expect(states.getSnapshot().get('bench-key')).toBeUndefined();
    stop();
  });
});
