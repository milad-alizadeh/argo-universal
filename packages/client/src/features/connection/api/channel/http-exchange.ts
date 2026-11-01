import { bytesText, concatBytes, textBytes } from './bytes';
import type { OpenedChannel } from './open-channel';

const headerEnd = textBytes('\r\n\r\n');

export interface HttpResponseHead {
  readonly status: number;
  readonly headers: Map<string, string>;
}

export function indexOfBytes(haystack: Uint8Array, needle: Uint8Array): number {
  for (let at = 0; at + needle.length <= haystack.length; at += 1)
    if (needle.every((byte, offset) => haystack[at + offset] === byte))
      return at;

  return -1;
}

function parseHeaders(lines: readonly string[]): Map<string, string> {
  const headers = new Map<string, string>();

  for (const line of lines) {
    const colon = line.indexOf(':');
    headers.set(
      line.slice(0, colon).toLowerCase(),
      line.slice(colon + 1).trim(),
    );
  }

  return headers;
}

function parseHead(text: string): HttpResponseHead {
  const [statusLine = '', ...lines] = text.split('\r\n');

  return {
    status: Number(statusLine.split(' ')[1]),
    headers: parseHeaders(lines),
  };
}

export interface HeadAndRest {
  readonly head: HttpResponseHead;
  readonly rest: Uint8Array;
}

// The status line and header lines of a response, split from whatever body bytes came with them.
export function readHead(received: Uint8Array): HeadAndRest | undefined {
  const end = indexOfBytes(received, headerEnd);

  if (end < 0) return undefined;

  return {
    head: parseHead(bytesText(received.subarray(0, end))),
    rest: received.subarray(end + headerEnd.length),
  };
}

export interface HttpRequest {
  readonly method: string;
  readonly path: string;
  readonly headers: Record<string, string>;
  readonly body?: Uint8Array;
}

const contentLength = (body: Uint8Array | undefined): string =>
  String(body?.length ?? 0);

function requestHead({ method, path, headers, body }: HttpRequest): string {
  const sent = { ...headers, 'content-length': contentLength(body) };

  const lines = [
    `${method} ${path} HTTP/1.0`,
    'Host: argo',
    ...Object.entries(sent).map(([name, value]) => `${name}: ${value}`),
  ];

  return `${lines.join('\r\n')}\r\n\r\n`;
}

const requestBytes = (request: HttpRequest): Uint8Array =>
  concatBytes(
    textBytes(requestHead(request)),
    request.body ?? new Uint8Array(0),
  );

export interface HttpResult {
  readonly head: HttpResponseHead;
  readonly body: Uint8Array;
}

const complete = ({ head, rest }: HeadAndRest): boolean =>
  rest.length >= Number(head.headers.get('content-length') ?? Infinity);

/*
 * One HTTP exchange inside a channel. The request says HTTP/1.0, so the Server answers without chunking and ends the stream when the body is done; the response is whatever arrives until then, or until its Content-Length is met.
 * A channel is already an authenticated Connection, so this is not an HTTP stack the platform polices: it is bytes the App reads for itself.
 */
export function exchange(
  channel: OpenedChannel,
  request: HttpRequest,
): Promise<HttpResult> {
  return new Promise<HttpResult>((resolve, reject): void => {
    const answer = new Answer(resolve, reject, () => channel.stream.close());

    channel.stream.listen({
      onData: (chunk) => answer.push(chunk),
      onClose: (error) => answer.end(error),
    });
    channel.stream.write(requestBytes(request));
  });
}

class Answer {
  private received: Uint8Array = new Uint8Array(0);

  public constructor(
    private readonly resolve: (result: HttpResult) => void,
    private readonly reject: (error: Error) => void,
    private readonly done: () => void,
  ) {}

  public push(chunk: Uint8Array): void {
    this.received = concatBytes(this.received, chunk);
    const read = readHead(this.received);

    if (read && complete(read)) this.finish(read);
  }

  // The Server ended the stream: whatever head arrived is the whole answer.
  public end(error?: Error): void {
    const read = readHead(this.received);

    if (error) this.reject(error);
    else if (read) this.finish(read);
    else this.reject(new Error('The Server closed before it answered'));
  }

  private finish({ head, rest }: HeadAndRest): void {
    this.done();
    this.resolve({ head, body: rest });
  }
}
