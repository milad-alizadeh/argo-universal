import type {
  FetchReply,
  ProcessResult,
} from '@repo/contracts/plugins/argo-calls';
import type { CheckedCommand } from '../access/plugin-access';
import type { PluginFetchCache } from './plugin-fetch-cache';
import type { Hop } from './plugin-fetch-response';
import { lower } from './plugin-rate-limit';

// The one `gh` read core knows (`github-cli-read-command.ts`): one GET of one endpoint, with the answer's headers printed.
const readForm = [
  'gh',
  'api',
  '--hostname',
  'github.com',
  '--method',
  'GET',
  '--include',
  '--',
];

// Stands in for the CLI's own login, which never reaches Argo, as the credential its answers and rate limit are kept by.
const loginHeader = 'x-argo-github-cli';

// The validators a conditional GET sends, as `gh api -H` takes them.
const askHeaders = [
  ['if-none-match', 'If-None-Match'],
  ['if-modified-since', 'If-Modified-Since'],
] as const;

const printedHead = /^HTTP\/\S+ (\d{3}) ?([^\r\n]*)\r?\n([\s\S]*?)\r?\n\r?\n/;

const okFirst = 200;

const okPast = 300;

type Run = (command: CheckedCommand) => Promise<ProcessResult>;

const endpointOf = (argv: readonly string[]): string | undefined =>
  argv.length === readForm.length + 1 &&
  readForm.every((arg, index) => argv[index] === arg)
    ? argv[readForm.length]
    : undefined;

// A login the Plugin names in the command's environment is its own credential; otherwise the CLI's signed-in one.
const loginOf = ({ env }: CheckedCommand): string =>
  env.GH_TOKEN ?? env.GITHUB_TOKEN ?? 'signed-in';

const hopOf = (endpoint: string, command: CheckedCommand): Hop => ({
  url: new URL(`https://api.github.com/${endpoint}`),
  method: 'GET',
  headers: { [loginHeader]: loginOf(command) },
  accountHeader: loginHeader,
});

const headersOf = (text: string): Record<string, string> =>
  Object.fromEntries(
    text.split(/\r?\n/).flatMap((line): [string, string][] => {
      const colon = line.indexOf(':');

      return colon > 0
        ? [[line.slice(0, colon).trim(), line.slice(colon + 1).trim()]]
        : [];
    }),
  );

/*
 * What `gh` printed, as the reply `argo.fetch` keeps. The body is everything it printed, head included, so a 304
 * answers exactly what the Plugin read the first time.
 */
function replyOf(result: ProcessResult): FetchReply {
  const head = printedHead.exec(result.stdout);
  const status = head ? Number(head[1]) : 0;

  return {
    ok: status >= okFirst && status < okPast,
    status,
    statusText: head?.[2] ?? '',
    headers: headersOf(head?.[3] ?? ''),
    body: result.stdout,
    truncated: result.truncated || result.timedOut,
  };
}

// The validators the cache asks with, as `-H` arguments ahead of the endpoint.
function conditional(argv: readonly string[], sent: Hop): string[] {
  const headers = lower(sent.headers);

  const asks = askHeaders.flatMap(([name, given]) =>
    headers[name] ? ['-H', `${given}: ${headers[name]}`] : [],
  );

  return [...argv.slice(0, -2), ...asks, ...argv.slice(-2)];
}

const printed = (reply: FetchReply, exitCode: number): ProcessResult => ({
  exitCode,
  stdout: reply.body,
  stderr: '',
  truncated: false,
  timedOut: false,
});

// What a closed limit answers in GitHub's place, as `gh api --include` prints a refusal.
const refused = (reply: FetchReply): ProcessResult =>
  printed(
    {
      ...reply,
      body: `HTTP/2.0 ${reply.status} ${reply.statusText}\r\n${Object.entries(
        reply.headers,
      )
        .map(([name, value]) => `${name}: ${value}\r\n`)
        .join('')}\r\n`,
    },
    1,
  );

/*
 * A Plugin's `gh api` reads go through the same cache as its `argo.fetch` (#2197): a read GitHub answered with an ETag
 * is asked again with `If-None-Match`, a 304 answers what was printed the first time and GitHub does not count it, and
 * a spent limit stops `gh` running until it resets. Any other command runs as it was given.
 */
export class GitHubCliCache {
  constructor(private readonly cache: PluginFetchCache) {}

  async run(command: CheckedCommand, run: Run): Promise<ProcessResult> {
    const endpoint = endpointOf(command.argv);

    if (endpoint === undefined) return run(command);

    let ran: { result: ProcessResult; reply: FetchReply } | undefined;

    const reply = await this.cache.fetch(
      hopOf(endpoint, command),
      async (sent) => {
        const result = await run({
          ...command,
          argv: conditional(command.argv, sent),
        });

        ran = { result, reply: replyOf(result) };

        return ran.reply;
      },
    );

    if (!ran) return refused(reply);

    return reply === ran.reply ? ran.result : printed(reply, 0);
  }
}
