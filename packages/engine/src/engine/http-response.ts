import type { ServerResponse } from 'node:http';
export const httpStatus = {
  ok: 200,
  forbidden: 403,
  notFound: 404,
  methodNotAllowed: 405,
  internalError: 500,
};

export const answerError = (
  response: ServerResponse,
  status: number,
  error: string | { message: string; headers: Record<string, string> },
): void => {
  response.writeHead(status, {
    'content-type': 'application/json',
    ...(typeof error === 'string' ? {} : error.headers),
  });
  response.end(
    JSON.stringify({
      error: typeof error === 'string' ? error : error.message,
    }),
  );
};
