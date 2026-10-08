import { beforeEach, vi } from 'vitest';

const rejectNetwork = (): never => {
  throw new Error(
    'Unit tests cannot use the network; replace its port or use an integration test.',
  );
};

class UnitWebSocket {
  public constructor() {
    rejectNetwork();
  }
}

const guardNetwork = (): void => {
  vi.stubGlobal('fetch', rejectNetwork);
  vi.stubGlobal('WebSocket', UnitWebSocket);
};

guardNetwork();
beforeEach(guardNetwork);
