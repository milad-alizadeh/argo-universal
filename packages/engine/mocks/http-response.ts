import type { IncomingMessage } from 'node:http';

export interface HttpResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

export function readHttpResponse(
  response: IncomingMessage,
): Promise<HttpResponse> {
  return new Promise((resolve, reject): void => {
    const chunks: Buffer[] = [];
    response.on('data', (chunk: Buffer): number => chunks.push(chunk));
    response.once('error', reject);
    response.once('end', (): void =>
      resolve(completeResponse(response, chunks)),
    );
  });
}

function completeResponse(
  response: IncomingMessage,
  chunks: Buffer[],
): HttpResponse {
  return {
    status: response.statusCode ?? 0,
    headers: response.headers,
    body: Buffer.concat(chunks).toString(),
  };
}
