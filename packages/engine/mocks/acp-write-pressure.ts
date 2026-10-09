import type { AnyMessage, Stream } from '@agentclientprotocol/sdk';
import { createAcpResources } from '../src/services/agents';
import { createResourcePeer } from './acp-resource';

export const pauseAcpResponses = (
  stream: Stream,
): {
  stream: Stream;
  entered: Promise<void>;
  resume: () => void;
  reject: (error: unknown) => void;
} => {
  const entered = Promise.withResolvers<void>();
  const resumed = Promise.withResolvers<void>();
  const writer = stream.writable.getWriter();
  return {
    entered: entered.promise,
    resume: () => resumed.resolve(),
    reject: (error) => resumed.reject(error),
    stream: {
      readable: stream.readable,
      writable: new WritableStream<AnyMessage>({
        write: async (message) => {
          if (!('method' in message)) {
            entered.resolve();
            await resumed.promise;
          }
          await writer.write(message);
        },
        close: () => writer.close(),
        abort: (reason: unknown) => writer.abort(reason),
      }),
    },
  };
};

export const createPressuredResource = (
  input: Parameters<typeof createResourcePeer>[0],
  closeTimeoutMs?: number,
): {
  peer: ReturnType<typeof createResourcePeer>;
  resources: ReturnType<typeof createAcpResources>;
  pressure: () => ReturnType<typeof pauseAcpResponses>;
} => {
  const peer = createResourcePeer(input);
  let paused: ReturnType<typeof pauseAcpResponses> | undefined;
  const resources = createAcpResources({
    closeTimeoutMs,
    launchProcess: async (launch) => {
      const process = await peer.launchProcess(launch);
      paused = pauseAcpResponses(process.stream);
      return { ...process, stream: paused.stream };
    },
  });
  return {
    peer,
    resources,
    pressure: () => {
      if (!paused) throw new Error('Missing pressured stream');
      return paused;
    },
  };
};
