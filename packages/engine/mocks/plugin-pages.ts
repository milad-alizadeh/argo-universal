import type {
  PageAddress,
  PageState,
} from '@repo/contracts/plugins/page-address';
import type { LiveAnswer } from '@repo/contracts/plugins/page-live';
import type { WireNode } from '@repo/contracts/plugins/wire';
import { onTestFinished } from 'vitest';
import type { EngineConnections } from './engine-read';

type Caller = EngineConnections['caller'];

export const pageAt = (
  pluginId: string,
  path: string,
  pageState: PageState = {},
): PageAddress => ({ pluginId, path, pageState });

// The tree a Loader page draws for the address, as an App that keeps none asks for it.
export async function drawnRoot(
  caller: Caller,
  address: PageAddress,
): Promise<WireNode> {
  const answer = await caller.plugins.draw({ ...address, pages: 1 });

  if (answer.kind !== 'tree')
    throw new Error(`Expected a tree: ${JSON.stringify(answer)}`);

  return answer.root;
}

// The text a page's root `Text` shows; a root that shows none fails the test.
export function textOf(root: WireNode): string {
  const children = root.props['children'];

  if (typeof children !== 'string')
    throw new Error(`Expected text: ${JSON.stringify(root)}`);

  return children;
}

// The first `count` answers a live page's subscription sends, on a Connection the test ends.
export async function liveAnswers(
  { createCaller }: Pick<EngineConnections, 'createCaller'>,
  address: PageAddress,
  count: number,
): Promise<LiveAnswer[]> {
  const controller = new AbortController();

  onTestFinished(() => controller.abort());

  const caller = createCaller({ signal: controller.signal });
  const live = await caller.plugins.live(address);

  return firstAnswers(live[Symbol.asyncIterator](), count);
}

async function firstAnswers(
  answers: AsyncIterator<LiveAnswer>,
  count: number,
): Promise<LiveAnswer[]> {
  const received: LiveAnswer[] = [];

  while (received.length < count) {
    const next = await answers.next();

    if (next.done) break;

    received.push(next.value);
  }

  return received;
}
