import {
  treeAnswer,
  type DrawAnswer,
  type DrawRequest,
} from '@repo/contracts/plugins/page-draw';
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

  readonly draw = async (request: DrawRequest): Promise<DrawAnswer> => {
    this.requests.push(request);

    if (this.holding)
      await new Promise<void>((resolve) => this.waiting.push(resolve));

    const { known, pages, ...address } = request;
    const key = JSON.stringify(address);
    const root = drawnTree(request, this.edition);
    const answer = { ...treeAnswer(root, this.sent.get(key), known), pages };

    this.sent.set(key, root);
    this.answers.push(answer);

    return answer;
  };

  // Draws wait until `release`, as slow ones do.
  hold(): void {
    this.holding = true;
  }

  release(): void {
    this.holding = false;

    for (const resolve of this.waiting.splice(0)) resolve();
  }

  // The Plugin's data changes, so every row draws a new edition.
  write(): void {
    this.edition += 1;
  }
}

export interface Cache {
  addresses: PageAddresses;
  server: MemoryServer;
  client: QueryClient;
}

export function cacheOverMemory(): Cache {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const server = new MemoryServer();

  return { addresses: new PageAddresses(client, server.draw), server, client };
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
  const observer = new QueryObserver(client, addresses.tree(opening));
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

export function kept(
  answer: Answer | undefined,
): Extract<Answer, { ok: true }> {
  if (!answer?.ok) throw new Error('No tree is kept');

  return answer;
}

export const rowsOf = (answer: Answer | undefined): WireNode[] =>
  kept(answer).root.children[0]?.children ?? [];
