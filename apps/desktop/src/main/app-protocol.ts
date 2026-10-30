import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { net, protocol } from 'electron';
import { contentSecurityPolicy } from './content-security-policy';

const appScheme = 'app';

export const appOrigin = `${appScheme}://app`;

const temporaryRedirectStatus = 307;

// Runs before `ready`: a standard, secure scheme gets relative URLs and web storage.
export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: appScheme,
      privileges: { standard: true, secure: true, supportFetchAPI: true },
    },
  ]);
}

function indexRedirect(url: URL, decodedPath: string): Response {
  const route = decodedPath.slice(0, -'index.html'.length);

  return Response.redirect(
    `${appOrigin}${route}${url.search}${url.hash}`,
    temporaryRedirectStatus,
  );
}

function exportTarget(
  directory: string,
  decodedPath: string,
): string | undefined {
  const filePath = path.join(directory, decodedPath);
  const relativePath = path.relative(directory, filePath);

  if (!safeRelativePath(relativePath)) return undefined;

  return exportFile(directory, relativePath, filePath);
}

function exportFile(
  directory: string,
  relativePath: string,
  filePath: string,
): string {
  return relativePath && path.extname(relativePath)
    ? filePath
    : path.join(directory, 'index.html');
}

function safeRelativePath(relativePath: string): boolean {
  return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

async function fetchExport(target: string): Promise<Response> {
  const response = await net.fetch(pathToFileURL(target).toString());
  const headers = new Headers(response.headers);
  headers.set('Content-Security-Policy', contentSecurityPolicy);

  return new Response(response.body, { status: response.status, headers });
}

async function serveExport(
  directory: string,
  request: Request,
): Promise<Response> {
  const url = new URL(request.url);
  const decodedPath = decodeURIComponent(url.pathname);

  // Expo Router reads the route from the URL, so /index.html must become /.
  if (decodedPath.endsWith('/index.html'))
    return indexRedirect(url, decodedPath);
  const target = exportTarget(directory, decodedPath);

  return target
    ? fetchExport(target)
    : new Response('Not found', { status: 404 });
}

// Serves the Expo web export; a path without an extension is a route and gets index.html.
export function handleAppProtocol(exportDirectory: string): void {
  protocol.handle(appScheme, (request): Promise<Response> =>
    serveExport(exportDirectory, request),
  );
}
