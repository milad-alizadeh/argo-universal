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

  return {
    entered: entered.promise,
    resume: () => resumed.resolve(),
    reject: (error) => resumed.reject(error),
    stream: pausedStream(stream, entered, resumed),
  };
};

const pausedStream = (
  stream: Stream,
  entered: PromiseWithResolvers<void>,
  resumed: PromiseWithResolvers<void>,
): Stream => {
  const writer = stream.writable.getWriter();

  return {
    readable: stream.readable,
    writable: new WritableStream<AnyMessage>({
      write: delayedWrite(writer, entered, resumed),
      close: () => writer.close(),
      abort: (cause: unknown) => writer.abort(cause),
    }),
  };
};

const delayedWrite =
  (
    writer: WritableStreamDefaultWriter<AnyMessage>,
    entered: PromiseWithResolvers<void>,
    resumed: PromiseWithResolvers<void>,
  ): ((message: AnyMessage) => Promise<void>) =>
  async (message) => {
    if (!('method' in message)) {
      entered.resolve();
      await resumed.promise;
    }

    await writer.write(message);
  };
