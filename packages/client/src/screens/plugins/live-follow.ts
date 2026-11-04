import type { PageAddress } from '@repo/contracts/plugins/page-address';
import type {
  LiveAnswer,
  LiveRequest,
  LiveTree,
} from '@repo/contracts/plugins/page-live';
import { hashKey, type QueryClient } from '@tanstack/react-query';
import { LiveBackoff } from './live-backoff';
import { failedAfter, liveAfter, type Answer } from './page-answer';
import { treeKey } from './page-keys';

// A live page's subscription for an address, naming what the App keeps, with each answer; the answer unsubscribes.
export type FollowPage = (
  request: LiveRequest,
  onAnswer: (answer: LiveAnswer) => void,
) => () => void;

// One address followed: the cache it writes, the subscription, the hash kept and who starts it over.
export type Following = {
  client: QueryClient;
  follow: FollowPage;
  address: PageAddress;
  known: string | undefined;
  again: () => void;
  backoff: LiveBackoff;
};

/*
 * An address's live subscription (ADR-0050), each answer built onto the tree kept for it. A patch onto a tree
 * the App no longer keeps ends it and asks `again`, so the next starts from a whole tree. A failure is kept
 * and the page drawn again, after a longer wait for each failure in a row, so a Plugin that ran again is followed
 * afresh and one that keeps failing is not followed at network speed. The answer unsubscribes.
 */
export function followLive(following: Following): () => void {
  const { follow, address, known } = following;
  const kept = new KeptTree(following);

  const stop = follow(
    { ...address, ...(known !== undefined && { known }) },
    (answer) => {
      if (!kept.took(answer)) stopThenAgain(stop, following.again);
    },
  );

  return stop;
}

function stopThenAgain(stop: () => void, again: () => void): void {
  stop();
  again();
}

// The tree the App keeps for a followed address, which takes each answer or says it cannot.
class KeptTree {
  private readonly key: ReturnType<typeof treeKey>;

  public constructor(private readonly following: Following) {
    this.key = treeKey(following.address);
  }

  // Whether the answer was kept; a patch onto a tree not kept was not.
  public took(answer: LiveAnswer): boolean {
    if (answer.kind === 'failed') return this.failed(answer.error);

    return this.drawn(answer);
  }

  private failed(error: string): true {
    const { client } = this.following;

    const wait = this.following.backoff.failed(hashKey(this.key));
    const drawAgain = (): void =>
      void client.invalidateQueries({ queryKey: this.key, exact: true });

    client.setQueryData(this.key, failedAfter(this.kept(), error));

    if (wait === 0) drawAgain();
    else setTimeout(drawAgain, wait);

    return true;
  }

  private drawn(answer: LiveTree): boolean {
    const next = liveAfter(this.kept(), answer);

    if (next) this.following.client.setQueryData(this.key, next);

    return next !== undefined;
  }

  private kept(): Answer | undefined {
    return this.following.client.getQueryData(this.key);
  }
}
