import {
  ndJsonStream,
  type AnyMessage,
  type AnyRequest,
  type Stream,
} from '@agentclientprotocol/sdk';

export const createAcpPeer = (): {
  stream: Stream;
  send: (messages: readonly AnyMessage[]) => Promise<void>;
  receive: () => Promise<AnyMessage>;
  sendRaw: (frame: string) => Promise<void>;
} => {
  const incoming = new TransformStream<Uint8Array, Uint8Array>();
  const outgoing = new TransformStream<Uint8Array, Uint8Array>();
  const sender = incoming.writable.getWriter();
  const receiver = ndJsonStream(
    new WritableStream(),
    outgoing.readable,
  ).readable.getReader();
  return {
    stream: ndJsonStream(outgoing.writable, incoming.readable),
    send: (messages) =>
      sender.write(
        new TextEncoder().encode(
          messages.map((message) => JSON.stringify(message)).join('\n') + '\n',
        ),
      ),
    sendRaw: (frame) => sender.write(new TextEncoder().encode(frame + '\n')),
    receive: async () => readMessage(receiver),
  };
};

const readMessage = async (
  reader: ReadableStreamDefaultReader<AnyMessage>,
): Promise<AnyMessage> => {
  const message = await reader.read();
  if (message.done)
    throw new Error('ACP peer closed before receiving a message');
  return message.value;
};

export const readAcpRequest = async (
  peer: ReturnType<typeof createAcpPeer>,
): Promise<AnyRequest> => {
  const message = await peer.receive();
  if (!('method' in message && 'id' in message))
    throw new Error('Expected an ACP request');
  return message;
};
