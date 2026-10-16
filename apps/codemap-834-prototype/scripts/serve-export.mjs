import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { exported } from './paths.mjs';

const status = { notFound: 404, ok: 200 };

const address = { host: '127.0.0.1', port: 8340 };

const mime = new Map([
  ['.wasm', 'application/wasm'],
  ['.js', 'text/javascript'],
  ['.css', 'text/css'],
  ['.json', 'application/json'],
  ['.html', 'text/html'],
]);

function requestedPath(url) {
  const pathname = new URL(url, `http://${address.host}`).pathname;

  if (!extname(pathname)) return resolve(exported, 'index.html');

  return resolve(exported, '.' + pathname);
}

function readable(path) {
  if (!path.startsWith(exported + '/')) return false;

  return existsSync(path) && statSync(path).isFile();
}

function serve(request, response) {
  const path = requestedPath(request.url);

  if (!readable(path)) {
    response.writeHead(status.notFound);
    response.end('Not found');

    return;
  }

  response.writeHead(status.ok, {
    'Content-Type': mime.get(extname(path)) ?? 'application/octet-stream',
  });
  response.end(readFileSync(path));
}

createServer(serve).listen(address.port, address.host);

console.log(
  `Export at http://${address.host}:${address.port}/codemap-834-prototype`,
);
