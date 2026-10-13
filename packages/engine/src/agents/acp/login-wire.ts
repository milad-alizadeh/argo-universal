import type {
  AnyMessage,
  AnyRequest,
  JsonRpcId,
  Stream,
} from '@agentclientprotocol/sdk';

const isAuthenticate = (message: AnyMessage): message is AnyRequest =>
  'method' in message && 'id' in message && message.method === 'authenticate';

export class AcpLoginWire {
  private authenticationRequest: JsonRpcId | undefined;
  public matches(requestId: JsonRpcId): boolean {
    return (
      this.authenticationRequest !== undefined &&
      requestId === this.authenticationRequest
    );
  }
  public forget(): void {
    this.authenticationRequest = undefined;
  }
  public observe(stream: Stream): Stream {
    const writer = stream.writable.getWriter();
    return {
      readable: stream.readable,
      writable: new WritableStream<AnyMessage>({
        write: (message) => {
          this.retain(message);
          return writer.write(message);
        },
        close: () => writer.close(),
        abort: (reason: unknown) => writer.abort(reason),
      }),
    };
  }
  private retain(message: AnyMessage): void {
    if (isAuthenticate(message)) this.authenticationRequest = message.id;
  }
}
