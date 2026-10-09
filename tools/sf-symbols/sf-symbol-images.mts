import { execFile } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';

const run = promisify(execFile);
const largestPointSize = 512;
const source = join(import.meta.dirname, 'render-sf-symbol.swift');
const binary = join(
  import.meta.dirname,
  '../node_modules/.cache/render-sf-symbol',
);

const SymbolRequest = z.object({
  name: z.string().regex(/^[a-z\d]+(?:\.[a-z\d]+)*$/),
  pointSize: z.coerce.number().int().min(1).max(largestPointSize),
});

type SymbolRequest = z.infer<typeof SymbolRequest>;

let unrecognisedRequests = 0;
let compiled: Promise<unknown> | undefined;

function compile(): Promise<unknown> {
  if (existsSync(binary)) return Promise.resolve();
  mkdirSync(dirname(binary), { recursive: true });
  compiled ??= run('swiftc', ['-O', source, '-o', binary]);
  return compiled;
}

function reject(error: z.ZodError, response: ServerResponse): void {
  unrecognisedRequests += 1;
  console.error(
    `storybook: unrecognised SF Symbol request #${unrecognisedRequests}`,
    error.issues,
  );
  response.statusCode = 400;
  response.end();
}

function answerEmpty(response: ServerResponse): void {
  response.statusCode = 204;
  response.end();
}

async function render(
  { name, pointSize }: SymbolRequest,
  response: ServerResponse,
): Promise<void> {
  await compile();
  const { stdout } = await run(binary, [name, String(pointSize)], {
    encoding: 'buffer',
  });
  response.setHeader('Content-Type', 'image/png');
  response.end(stdout);
}

// Off macOS swiftc is missing, so this answers 204 as for an unknown symbol and the story draws an empty SF cell.
function handle(request: IncomingMessage, response: ServerResponse): void {
  const symbol = SymbolRequest.safeParse(
    Object.fromEntries(new URLSearchParams(String(request.url).split('?')[1])),
  );
  if (!symbol.success) return reject(symbol.error, response);
  render(symbol.data, response).catch(() => answerEmpty(response));
}

// Apple's licence keeps SF Symbols off non-Apple platforms, so Storybook draws them from this Mac at request time.
export const sfSymbolImages = {
  name: 'sf-symbol-images',
  configureServer(server: {
    middlewares: {
      use: (
        path: string,
        handler: (request: IncomingMessage, response: ServerResponse) => void,
      ) => void;
    };
  }): void {
    server.middlewares.use('/__sf-symbol', handle);
  },
};
