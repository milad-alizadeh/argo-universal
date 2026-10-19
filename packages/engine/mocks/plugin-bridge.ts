import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { PluginRequest } from '../src/plugins/protocol/runtime';

type Answer = (request: PluginRequest) => Json;

export type FakeBridge = {
  bridge: (json: string) => Promise<string>;
  requests: PluginRequest[];
};

// The worker's side of a Plugin's bridge: JSON in, JSON out, keeping every request the Plugin API sent.
export function fakeBridge(answer: Answer = () => null): FakeBridge {
  const requests: PluginRequest[] = [];

  return {
    requests,
    bridge: async (json) => {
      const request: PluginRequest = JSON.parse(json);

      requests.push(request);

      return JSON.stringify(answer(request));
    },
  };
}

// The outcome a Hook's invocation settled with, once it has.
export const settled = (requests: PluginRequest[]): PluginRequest | undefined =>
  requests.find(
    (request) => request.api === 'hooks' && request.call.action === 'settle',
  );
