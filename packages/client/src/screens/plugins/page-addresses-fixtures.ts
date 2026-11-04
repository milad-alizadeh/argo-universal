import {
  treeAnswer,
  type DrawAnswer,
  type DrawPacing,
  type DrawRequest,
} from '@repo/contracts/plugins/page-draw';
import type {
  LiveAnswer,
  LiveRequest,
} from '@repo/contracts/plugins/page-live';
import type { WireNode } from '@repo/contracts/plugins/wire';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { PageAddresses, type Answer, type PageOpening } from './page-addresses';

const rowsPerPage = 2;

const node = (
  type: string,
  key: string,
  { props = {}, children = [] }: Partial<WireNode>,
): WireNode => ({ type, key, props, children, slots: {} });

// A Screen titled by the Page state's query over a List of `rowsPerPage` rows a page, keyed by the Page path.
function drawnTree(
  { path, pageState, pages }: DrawRequest,
  edition: number,
): WireNode {
  const rows = Array.from({ length: pages * rowsPerPage }, (_, index) =>
    node('ListItem', `${path}#${index}`, {
      props: { title: `Row ${index}`, edition },
    }),
  );

  const list = node('List', 'list', { props: { pages }, children: rows });
  const title = String(pageState.query ?? '');

  return node('Screen', 'screen', { props: { title }, children: [list] });
}

// A Server in memory that answers each draw as the Contracts answer it, from the tree last sent to the address.
class MemoryServer {
  readonly requests: DrawRequest[] = [];
  readonly answers: DrawAnswer[] = [];
  private readonly sent = new Map<string, WireNode>();
  private readonly waiting: (() => void)[] = [];
  private holding = false;
  private edition = 0;
  // How every page answers it stays fresh: on an interval, or live.
  pacing: DrawPacing = {};
  // Draws fail with this until it is cleared.
  failing: string | undefined;
  // What every address draws.
  tree: (request: DrawRequest, edition: number) => WireNode = drawnTree;

  readonly draw = async (request: DrawRequest): Promise<DrawAnswer> => {
    this.requests.push(request);
    await this.held();

    return this.failing === undefined
      ? this.drawn(request)
      : { kind: 'failed', error: this.failing };
  };

  private async held(): Promise<void> {
    if (this.holding)
      await new Promise<void>((resolve) => this.waiting.push(resolve));
  }

  private drawn({ known, pages, ...address }: DrawRequest): DrawAnswer {
    const key = JSON.stringify(address);
    const root = this.tree({ ...address, pages }, this.edition);
    const tree = treeAnswer(root, this.sent.get(key), known);
    const answer = { ...tree, pages, ...this.pacing };

    this.sent.set(key, root);
    this.answers.push(answer);

    return answer;
  }

  // Draws wait until `release`, as slow ones do.
  hold(): void {
    this.holding = true;
  }

  release(): void {
    this.holding = false;

    for (const resolve of this.waiting.splice(0)) resolve();
  }

  // Draws wait until `release`, and the one asked last answers first, as a slower earlier one does.
  releaseNewestFirst(): void {
    this.holding = false;

    for (const resolve of this.waiting.splice(0).reverse()) resolve();
  }

  // The Plugin's data changes, so every row draws a new edition.
  write(): void {
    this.edition += 1;
  }
}

// A live page's subscriptions in memory: each records what it asked for, and the test sends its answers.
class MemoryLive {
  readonly followed: { request: LiveRequest; open: boolean }[] = [];
  private readonly listeners: ((answer: LiveAnswer) => void)[] = [];

  readonly follow = (
    request: LiveRequest,
    onAnswer: (answer: LiveAnswer) => void,
  ): (() => void) => {
    const followed = { request, open: true };

    this.followed.push(followed);
    this.listeners.push(onAnswer);

    return () => {
      followed.open = false;
    };
  };

  // The latest subscription, and whether it is still open.
  latest(): { request: LiveRequest; open: boolean } {
    const latest = this.followed.at(-1);

    if (!latest) throw new Error('Nothing is followed');

    return latest;
  }

  // The latest subscription's answer.
  send(answer: LiveAnswer): void {
    this.listeners.at(-1)?.(answer);
  }
}

export interface Cache {
  addresses: PageAddresses;
  server: MemoryServer;
  live: MemoryLive;
  client: QueryClient;
}

export function cacheOverMemory(): Cache {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const server = new MemoryServer();
  const live = new MemoryLive();
  const addresses = new PageAddresses(client, server.draw, live.follow);

  return { addresses, server, live, client };
}

export const issues: PageOpening = {
  pluginId: 'tracker',
  path: '/issues',
  projectId: 'argo',
};

export interface OnScreen {
  answer: () => Answer | undefined;
  leave: () => void;
}

// A screen showing the opening: its tree is subscribed, so a stale mark draws it again.
export function onScreen(
  { addresses, client }: Cache,
  opening: PageOpening,
): OnScreen {
  const tree = addresses.tree(opening, addresses.state(opening).initialData());
  const observer = new QueryObserver(client, tree);

  const leave = observer.subscribe(() => null);

  return { answer: () => observer.getCurrentResult().data, leave };
}

// Enough turns for the draws waiting now and the ones their answers start.
export async function settled(): Promise<void> {
  for (let round = 0; round < 10; round += 1)
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
}

export type Kept = Extract<Answer, { ok: true }>;

export function kept(answer: Answer | undefined): Kept {
  if (!answer?.ok) throw new Error('No tree is kept');

  return answer;
}

export const rowsOf = (answer: Answer | undefined): WireNode[] =>
  kept(answer).root.children[0]?.children ?? [];
