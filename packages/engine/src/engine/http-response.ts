import type { ServerResponse } from 'node:http';

export const httpStatus = {
  ok: 200,
  notModified: 304,
  forbidden: 403,
  notFound: 404,
  methodNotAllowed: 405,
  internalError: 500,
};

const jsonHeaders = { 'content-type': 'application/json' };

type HttpError = string | { message: string; headers: Record<string, string> };

const errorHeaders = (error: HttpError): Record<string, string> =>
  typeof error === 'string'
    ? jsonHeaders
    : { ...jsonHeaders, ...error.headers };

export const answerError = (
  response: ServerResponse,
  status: number,
  error: HttpError,
): void => {
  response.writeHead(status, errorHeaders(error));
  response.end(
    JSON.stringify({
      error: typeof error === 'string' ? error : error.message,
    }),
  );
};

export function reportHttpFailure(
  response: ServerResponse,
  cause: unknown,
): void {
  console.error(`engine: ${String(cause)}`);

  if (response.headersSent) response.destroy();
  else answerError(response, httpStatus.internalError, 'Internal error');
}
