import type { AnyMessage, Stream } from '@agentclientprotocol/sdk';

interface PausedAcpResponses {
  stream: Stream;
  entered: Promise<void>;
  resume: () => void;
  reject: (cause: unknown) => void;
}

export const pauseAcpResponses = (stream: Stream): PausedAcpResponses => {
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
        abort: (cause: unknown) => writer.abort(cause),
      }),
    },
  };
};
