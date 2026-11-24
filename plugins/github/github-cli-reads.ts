import type { Argo } from '@argo/plugin-kit';
import type { Json } from './json';
import { githubHost } from './pull-reads';

type Fetch = Argo['fetch'];

type Reply = NonNullable<Awaited<ReturnType<Fetch>>>;

type Source = Pick<Argo, 'fetch' | 'process' | 'settings'>;

const timeoutMs = 8_000;

const httpHeaders = /^HTTP\/\S+ (200)[^\r\n]*\r?\n[\s\S]*?\r?\n\r?\n/;

// Return a reply only after gh has a complete, successful HTTP response.
function replyOf(stdout: string): Reply | undefined {
  const headers = httpHeaders.exec(stdout);

  if (!headers) return undefined;

  const body = stdout.slice(headers[0].length);

  try {
    const json: Json = JSON.parse(body);

    return {
      body,
      ok: true,
      status: Number(headers[1]),
      statusText: 'OK',
      headers: {},
      truncated: false,
      text: async () => body,
      json: async () => json,
    };
  } catch {
    return undefined;
  }
}

async function read(
  { process }: Pick<Source, 'process'>,
  endpoint: string,
): Promise<Reply | undefined> {
  const result = await process
    .run(
      [
        'gh',
        'api',
        '--hostname',
        'github.com',
        '--method',
        'GET',
        '--include',
        '--',
        endpoint,
      ],
      { env: { GH_PROMPT_DISABLED: '1' }, timeoutMs },
    )
    .catch(() => null);

  if (!result || result.exitCode !== 0 || result.truncated || result.timedOut)
    return undefined;

  return replyOf(result.stdout);
}

const forbiddenStatus = 403;

const notFoundStatus = 404;

/*
 * A refusal the Account's login can give for a repository the CLI's login may still see: an organization that has not
 * approved Argo's app answers 403, or 404 to hide the repository. A spent rate limit is no such refusal, and is left to
 * the fetch gate that honours `retry-after` and `x-ratelimit-reset`.
 */
const refusedToAccount = ({ status, headers }: Reply): boolean =>
  (status === forbiddenStatus || status === notFoundStatus) &&
  !Object.keys(headers).some((name) =>
    ['retry-after', 'x-ratelimit-remaining'].includes(name.toLowerCase()),
  );

/*
 * This transport is used only by the GitHub Plugin's Project-scoped PR reads. "Prefer GitHub CLI for reads" makes the
 * CLI's login the first to try; the CLI is also tried, whatever the setting, once the Account's login was refused.
 */
export function githubReadFetch(argo: Source): Fetch {
  return async (url, init) => {
    const root = `https://${githubHost}/`;

    if (init?.method !== 'GET' || !url.startsWith(`${root}repos/`))
      return argo.fetch(url, init);

    const endpoint = url.slice(root.length);
    const preferred = (await argo.settings.get('prefer-github-cli')) === true;
    const first = preferred ? await read(argo, endpoint) : undefined;

    if (first) return first;

    const reply = await argo.fetch(url, init);

    if (preferred || !reply || !refusedToAccount(reply)) return reply;

    return (await read(argo, endpoint)) ?? reply;
  };
}
