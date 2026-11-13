import { readFileSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { createServer, request } from 'node:https';
import { fixtureTls } from '@repo/engine/mocks/fixture-tls';
import type { PluginNetwork } from '@repo/engine/plugins';
import { z } from 'zod';

// The token the fixture Account hands out, which the fixture GitHub accepts.
const token = 'fixture-token';

const Pull = z.object({
  repository: z.string(),
  number: z.number(),
  title: z.string(),
  branch: z.string(),
  head: z.string(),
  base: z.string(),
  additions: z.number(),
  deletions: z.number(),
  files: z.array(
    z.object({
      filename: z.string(),
      status: z.enum(['added', 'removed', 'modified', 'renamed']),
      additions: z.number(),
      deletions: z.number(),
      patch: z.string().optional(),
    }),
  ),
  checks: z.array(
    z.object({
      name: z.string(),
      status: z.enum(['queued', 'in_progress', 'completed']),
      conclusion: z.string().nullable(),
    }),
  ),
});

type Pull = z.infer<typeof Pull>;

// What the fixture GitHub knows: pull requests with their files and Checks.
const Fixture = z.object({ pulls: z.array(Pull) });

type Answer = { status: number; json: object };

const okStatus = 200;

const notFound: Answer = { status: 404, json: { message: 'Not Found' } };

const unauthorized: Answer = {
  status: 401,
  json: { message: 'Bad credentials' },
};

const ok = (json: object): Answer => ({ status: okStatus, json });

const named = (
  pulls: readonly Pull[],
  repository: string | undefined,
  number: string | undefined,
): Pull | undefined =>
  pulls.find(
    (pull) => pull.repository === repository && String(pull.number) === number,
  );

const repositoryOf = ({ repository }: Pull): Record<'full_name', string> => ({
  full_name: repository,
});

const pullJson = (pull: Pull): Answer =>
  ok({
    number: pull.number,
    title: pull.title,
    state: 'open',
    merged: false,
    draft: false,
    mergeable_state: 'clean',
    html_url: `https://github.com/${pull.repository}/pull/${pull.number}`,
    additions: pull.additions,
    deletions: pull.deletions,
    changed_files: pull.files.length,
    head: { ref: pull.branch, sha: pull.head, repo: repositoryOf(pull) },
    base: { ref: pull.base, repo: repositoryOf(pull) },
  });

function filesPage(pull: Pull, query: string | undefined): Answer {
  const params = new URLSearchParams(query);
  const size = Number(params.get('per_page') ?? 30);
  const page = Number(params.get('page') ?? 1);

  return ok(pull.files.slice((page - 1) * size, page * size));
}

type Match = readonly (string | undefined)[];

type Route = {
  pattern: RegExp;
  answer: (pulls: readonly Pull[], match: Match) => Answer;
};

const pullOf = (pulls: readonly Pull[], match: Match): Pull | undefined =>
  named(pulls, match[1], match[2]);

const routes: Route[] = [
  {
    pattern: /^\/repos\/([^/]+\/[^/]+)\/pulls\/(\d+)\/files(?:\?(.*))?$/,
    answer: (pulls, match) => {
      const pull = pullOf(pulls, match);

      return pull ? filesPage(pull, match[3]) : notFound;
    },
  },
  {
    pattern: /^\/repos\/([^/]+\/[^/]+)\/pulls\/(\d+)$/,
    answer: (pulls, match) => {
      const pull = pullOf(pulls, match);

      return pull ? pullJson(pull) : notFound;
    },
  },
  {
    pattern: /^\/repos\/([^/]+\/[^/]+)\/commits\/([0-9a-f]+)\/check-runs/,
    answer: (pulls, match) => {
      const owner = pulls.find(
        ({ repository, head }) => repository === match[1] && head === match[2],
      );

      return owner
        ? ok({ total_count: owner.checks.length, check_runs: owner.checks })
        : notFound;
    },
  },
];

function route(pulls: readonly Pull[], path: string): Answer {
  for (const { pattern, answer } of routes) {
    const match = pattern.exec(path);

    if (match) return answer(pulls, match);
  }

  return notFound;
}

function respond(response: ServerResponse, answer: Answer): void {
  response.writeHead(answer.status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(answer.json));
}

const portOf = (
  address: ReturnType<ReturnType<typeof createServer>['address']>,
): number => {
  if (address === null || typeof address === 'string')
    throw new Error('The fixture GitHub is not listening on a port');

  return address.port;
};

// Every request, whatever host it names, goes to the fixture over a certificate only this Server trusts.
const networkTo = (port: number, ca: string): PluginNetwork => ({
  ca,
  request: (url, options) =>
    request(new URL(`https://127.0.0.1:${port}${url.pathname}${url.search}`), {
      ...options,
      servername: 'localhost',
      headers: { ...options.headers, host: url.host },
    }),
});

/*
 * A fixture GitHub for the E2E Server: the pull request endpoints the GitHub Plugin reads, answered from a file the
 * scenario wrote. Every host a Plugin names reaches it.
 */
export async function startGitHubFixture(path: string): Promise<PluginNetwork> {
  const { pulls } = Fixture.parse(JSON.parse(readFileSync(path, 'utf8')));
  const tls = await fixtureTls();

  const server = createServer(tls, (incoming, response) =>
    respond(
      response,
      incoming.headers.authorization === `Bearer ${token}`
        ? route(pulls, incoming.url ?? '/')
        : unauthorized,
    ),
  );

  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));

  return networkTo(portOf(server.address()), tls.cert);
}
