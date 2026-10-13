import { request, type IncomingMessage } from 'node:http';
import { WebSocket } from 'ws';

interface HttpRequest {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | Uint8Array;
}
export interface HttpResponse {
  status: number;
  headers: IncomingMessage['headers'];
  body: string;
}

function readResponse(
  response: IncomingMessage,
  resolve: (value: HttpResponse) => void,
): void {
  const chunks: Buffer[] = [];
  response.on('data', (chunk: Buffer): number => chunks.push(chunk));
  response.once('end', (): void =>
    resolve({
      status: response.statusCode ?? 0,
      headers: response.headers,
      body: Buffer.concat(chunks).toString(),
    }),
  );
}

export const sendHttpRequest = (
  url: string,
  options: HttpRequest,
): Promise<HttpResponse> =>
  new Promise<HttpResponse>((resolve, reject): void => {
    const outgoing = request(
      new URL(options.path, url),
      options,
      (response): void => readResponse(response, resolve),
    );
    outgoing.once('error', reject);
    outgoing.end(options.body);
  });

function createUploadForm(): FormData {
  const form = new FormData();
  form.set('file', new File(['file content'], 'notes.txt'));
  return form;
}

const formHeaders = (
  encoded: Request,
  origin?: string,
): Record<string, string> => ({
  'content-type': encoded.headers.get('content-type') ?? '',
  ...(origin ? { origin } : {}),
});

export async function sendFormRequest(
  url: string,
  origin?: string,
): Promise<HttpResponse> {
  const encoded = new Request(url, {
    method: 'POST',
    body: createUploadForm(),
  });
  return sendHttpRequest(url, {
    path: '/trpc/blob.upload',
    method: 'POST',
    headers: formHeaders(encoded, origin),
    body: new Uint8Array(await encoded.arrayBuffer()),
  });
}

function observeUpgrade(
  socket: WebSocket,
  resolve: (status: number) => void,
): void {
  socket.once('open', (): void => {
    socket.close();
    resolve(101);
  });
  socket.once('unexpected-response', (_request, response): void => {
    resolve(response.statusCode ?? 0);
    response.resume();
  });
}

export const upgradeStatus = (
  url: string,
  headers: Record<string, string> = {},
): Promise<number> =>
  new Promise<number>((resolve, reject): void => {
    const socket = new WebSocket(url.replace('http:', 'ws:'), { headers });
    observeUpgrade(socket, resolve);
    socket.once('error', reject);
  });
