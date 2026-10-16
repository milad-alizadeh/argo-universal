import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = fileURLToPath(
  new URL('../../universal-app/dist-codemap-834/', import.meta.url),
);
createServer((request, response) => {
  const path = resolve(
    directory,
    `.${new URL(request.url, 'http://localhost').pathname}`,
  );
  if (!path.startsWith(directory)) {
    response.writeHead(403);
    response.end();
    return;
  }
  const target = extname(path) ? path : resolve(directory, 'index.html');
  if (!existsSync(target)) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.setHeader(
    'Content-Type',
    {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.wasm': 'application/wasm',
      '.json': 'application/json',
    }[extname(target)] ?? 'application/octet-stream',
  );
  response.end(readFileSync(target));
}).listen(8340, '127.0.0.1', () =>
  console.log('Export at http://127.0.0.1:8340/codemap-834-prototype'),
);
