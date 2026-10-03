import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { net, protocol } from 'electron';

export const appScheme = 'app';
export const appOrigin = `${appScheme}://app`;

// The Expo web build inlines its style reset, and React Native Web inserts styles at runtime.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: http://127.0.0.1:*",
  "font-src 'self' data:",
  "connect-src 'self' ws://127.0.0.1:* http://127.0.0.1:*",
].join('; ');

// Runs before `ready`: a standard, secure scheme gets relative URLs and web storage.
export function registerAppScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: appScheme,
      privileges: { standard: true, secure: true, supportFetchAPI: true },
    },
  ]);
}

// Serves the Expo web export; a path without an extension is a route and gets index.html.
export function handleAppProtocol(exportDirectory: string) {
  protocol.handle(appScheme, async (request) => {
    const { pathname, search, hash } = new URL(request.url);
    const decodedPath = decodeURIComponent(pathname);
    // Expo Router reads the route from the URL, so /index.html must become /.
    if (decodedPath.endsWith('/index.html')) {
      const route = decodedPath.slice(0, -'index.html'.length);
      return Response.redirect(`${appOrigin}${route}${search}${hash}`, 307);
    }
    const filePath = path.join(exportDirectory, decodedPath);
    const relativePath = path.relative(exportDirectory, filePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return new Response('Not found', { status: 404 });
    }
    const target =
      relativePath && path.extname(relativePath)
        ? filePath
        : path.join(exportDirectory, 'index.html');
    const response = await net.fetch(pathToFileURL(target).toString());
    const headers = new Headers(response.headers);
    headers.set('Content-Security-Policy', contentSecurityPolicy);
    return new Response(response.body, {
      status: response.status,
      headers,
    });
  });
}
