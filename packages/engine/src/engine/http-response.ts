import type { ServerResponse } from 'node:http';

export const httpStatus = {
  ok: 200,
  forbidden: 403,
  notFound: 404,
  methodNotAllowed: 405,
  internalError: 500,
};

export function answerError(
  response: ServerResponse,
  status: number,
  error: string,
): void {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error }));
}
