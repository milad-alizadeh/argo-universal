import { git } from './git';
import { rejectResponse } from './reject-response';

// `git remote get-url` exits with this code when the remote does not exist.
const noSuchRemote = 2;

const hasExitCode = (
  error: unknown,
  code: number,
): error is Error & { code: number } =>
  error instanceof Error && 'code' in error && error.code === code;

const schemeUrl = /^[a-z][a-z\d+.-]*:\/\//i;

// scp-like syntax, such as git@github.com:owner/repo.git
const scpUrl = /^(?:[^@/]+@)?(?<host>[^:/]+):(?!\/\/)/;

// A URL remote's host, or null for a remote on this machine; throws on a URL with no host.
function readRemoteUrlHost(url: string): string | null {
  if (schemeUrl.test(url)) {
    return schemeHost(url);
  }

  return scpHost(url);
}

function scpHost(url: string): string | null {
  const match = scpUrl.exec(url);

  return matchHost(match);
}

function matchHost(match: RegExpExecArray | null): string | null {
  return groupHost(match?.groups);
}

function groupHost(groups: Record<string, string> | undefined): string | null {
  return groups?.host ?? null;
}

function schemeHost(url: string): string | null {
  const parsed = URL.parse(url);

  if (!parsed) return rejectResponse('remote URL');

  if (parsed.protocol === 'file:') return null;

  return urlHostname(parsed);
}

function urlHostname(url: URL): string {
  return url.hostname || rejectResponse('remote URL');
}

// The host the origin remote lives on, or null when there is no origin or it is a local path.
export async function readOriginHost(
  projectPath: string,
): Promise<string | null> {
  const url = await readOriginUrl(projectPath);

  return url === null ? null : readRemoteUrlHost(url);
}

export async function readOriginUrl(
  projectPath: string,
): Promise<string | null> {
  try {
    return (await originUrl(projectPath)).trim();
  } catch (error) {
    if (hasExitCode(error, noSuchRemote)) return null;
    throw error;
  }
}

function originUrl(projectPath: string): Promise<string> {
  return git(projectPath, ['remote', 'get-url', 'origin']);
}
