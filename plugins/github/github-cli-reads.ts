import type { Argo } from '@argo/plugin-kit';
import type { Json } from './json';
import { githubHost, isRateLimit, limitSpent } from './pull-reads';

type Fetch = Argo['fetch'];

type Reply = NonNullable<Awaited<ReturnType<Fetch>>>;

type Source = Pick<Argo, 'fetch' | 'process' | 'settings'>;

const timeoutMs = 8_000;

const httpHeaders = /^HTTP\/\S+ (200)[^\r\n]*\r?\n[\s\S]*?\r?\n\r?\n/;

// The status line and headers of any answer `gh api --include` printed, successful or not.
const anyHeaders = /^HTTP\/\S+ (\d{3})[^\r\n]*\r?\n([\s\S]*?)\r?\n\r?\n/;

const secondMs = 1_000;

// How long the CLI rests when GitHub says its limit is spent but not until when; core's fetch waits as long.
const defaultBackoffMs = 60_000;

// The status and headers of one answer the CLI printed.
type ResponseHead = { status: number; headers: Map<string, string> };

function responseHeadOf(stdout: string): ResponseHead | undefined {
  const match = anyHeaders.exec(stdout);

  if (!match) return undefined;

  const headers = new Map(
    (match[2] ?? '').split(/\r?\n/).flatMap((line): [string, string][] => {
      const colon = line.indexOf(':');

      return colon > 0
        ? [
            [
              line.slice(0, colon).trim().toLowerCase(),
              line.slice(colon + 1).trim(),
            ],
          ]
        : [];
    }),
  );

  return { status: Number(match[1]), headers };
}

const spentIn = ({ status, headers }: ResponseHead): boolean =>
  limitSpent(status, (name) => headers.get(name));

const secondsOf = (value: string | undefined): number | undefined => {
  const seconds = value?.trim() ? Number(value) : Number.NaN;

  return Number.isFinite(seconds) ? Math.max(seconds, 0) : undefined;
};

// When the CLI may ask again: `retry-after` first, then the reset while it is ahead, then a minute.
function reopensAt({ headers }: ResponseHead, now: number): number {
  const after = secondsOf(headers.get('retry-after'));

  if (after !== undefined) return now + after * secondMs;

  const reset = secondsOf(headers.get('x-ratelimit-reset'));

  return reset !== undefined && reset * secondMs > now
    ? reset * secondMs
    : now + defaultBackoffMs;
}

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

// Until when the CLI rests because GitHub said the rate limit is spent; every read before then skips it.
type Rest = { until: number };

async function read(
  { process }: Pick<Source, 'process'>,
  rest: Rest,
  endpoint: string,
): Promise<Reply | undefined> {
  if (Date.now() < rest.until) return undefined;

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

  if (!result || result.truncated || result.timedOut) return undefined;

  const head = responseHeadOf(result.stdout);

  if (head && spentIn(head)) rest.until = reopensAt(head, Date.now());

  if (result.exitCode !== 0) return undefined;

  return replyOf(result.stdout);
}

const forbiddenStatus = 403;

const notFoundStatus = 404;

/*
 * A refusal the Account's login can give for a repository the CLI's login may still see: an organization that has not
 * approved Argo's app answers 403, or 404 to hide the repository. A spent rate limit is no such refusal, and is left to
 * the fetch gate that honours `retry-after` and `x-ratelimit-reset`.
 */
const refusedToAccount = (reply: Reply): boolean =>
  (reply.status === forbiddenStatus || reply.status === notFoundStatus) &&
  !isRateLimit(reply);

/*
 * This transport is used only by the GitHub Plugin's Project-scoped PR reads. "Prefer GitHub CLI for reads" makes the
 * CLI's login the first to try; the CLI is also tried, whatever the setting, once the Account's login was refused. While
 * GitHub says the CLI's limit is spent, reads skip `gh` and go straight to the Project Account, whose fetch keeps its own
 * rest.
 */
export function githubReadFetch(argo: Source): Fetch {
  const rest: Rest = { until: 0 };

  return async (url, init) => {
    const root = `https://${githubHost}/`;

    if (init?.method !== 'GET' || !url.startsWith(`${root}repos/`))
      return argo.fetch(url, init);

    const endpoint = url.slice(root.length);
    const preferred = (await argo.settings.get('prefer-github-cli')) === true;
    const first = preferred ? await read(argo, rest, endpoint) : undefined;

    if (first) return first;

    const reply = await argo.fetch(url, init);

    if (preferred || !reply || !refusedToAccount(reply)) return reply;

    return (await read(argo, rest, endpoint)) ?? reply;
  };
}
