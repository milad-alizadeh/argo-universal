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
  { process, settings }: Source,
  endpoint: string,
): Promise<Reply | undefined> {
  if ((await settings.get('prefer-github-cli')) !== true) return undefined;

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

// This transport is used only by the GitHub Plugin's Project-scoped PR reads.
export function githubReadFetch(argo: Source): Fetch {
  return async (url, init) => {
    const root = `https://${githubHost}/`;

    if (init?.method !== 'GET' || !url.startsWith(`${root}repos/`))
      return argo.fetch(url, init);

    const endpoint = url.slice(root.length);

    return (await read(argo, endpoint)) ?? argo.fetch(url, init);
  };
}
