import type { SessionUpdate } from '@repo/contracts';
import type * as React from 'react';
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { recordedImageUrl } from '../../../../lib/product/feed-message.mocks';
import { toFeedView } from '../../view/to-feed-view';
import { Feed, type FeedProps } from './feed';
import { longSnapshot, longTail, pageSize } from './feed.mocks';
import { type HeldFeed, viewOf } from './paged-feed-view.mocks';

// The Feed's story args: the Long Feed's newest page.
export const feedArgs = {
  items: toFeedView(longTail, longSnapshot).items,
  liveHeader: null,
  loadingOlder: false,
  onStartReached: (): void => {},
  imageUrl: recordedImageUrl,
} satisfies FeedProps;

let releaseOlderPage = (): void => {};

// Sends the older page the Feed is waiting for.
export const sendOlderPage = (): void => releaseOlderPage();

let deliverRow = (_row: SessionUpdate): void => {};

// Sends a new row to the end of the Feed, as a live change does.
export const sendRow = (row: SessionUpdate): void => deliverRow(row);

const olderPageSent = (): Promise<void> =>
  new Promise<void>((resolve) => {
    releaseOlderPage = resolve;
  });

type SetHeldFeed = Dispatch<SetStateAction<HeldFeed>>;

const newestPageStart = (
  rows: readonly SessionUpdate[],
  size: number,
): number => Math.max(0, rows.length - size);

const withArrivedRow =
  (rows: readonly SessionUpdate[], row: SessionUpdate) =>
  (held: HeldFeed): HeldFeed =>
    viewOf(held.view, rows, {
      start: held.start,
      arrived: [...held.arrived, row],
    });

function useDeliversRows(
  rows: readonly SessionUpdate[],
  setFeed: SetHeldFeed,
): void {
  useEffect(() => {
    deliverRow = (row): void => setFeed(withArrivedRow(rows, row));

    return (): void => {
      deliverRow = (): void => {};
    };
  }, [rows, setFeed]);
}

interface OlderPages {
  rows: readonly SessionUpdate[];
  setFeed: SetHeldFeed;
  holdOlderPages?: boolean;
  pageLength?: number;
}

interface OlderPageLoad extends OlderPages {
  paging: { start: number; inFlight: boolean };
  setLoadingOlder: (loading: boolean) => void;
}

const canLoadOlder = ({ inFlight, start }: OlderPageLoad['paging']): boolean =>
  !inFlight && start !== 0;

function prependOlderPage(load: OlderPageLoad): void {
  const { paging } = load;
  paging.start = Math.max(0, paging.start - (load.pageLength ?? pageSize));
  const nextStart = paging.start;
  load.setFeed((held) =>
    viewOf(held.view, load.rows, { start: nextStart, arrived: held.arrived }),
  );
  paging.inFlight = false;
  load.setLoadingOlder(false);
}

const nextTurn = (): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

function deliveryWait(load: OlderPageLoad): Promise<void> | undefined {
  if (load.holdOlderPages) return olderPageSent();

  return load.pageLength ? nextTurn() : undefined;
}

async function loadOlderPage(load: OlderPageLoad): Promise<void> {
  if (!canLoadOlder(load.paging)) return;
  load.paging.inFlight = true;
  load.setLoadingOlder(true);

  const wait = deliveryWait(load);

  if (wait) await wait;
  prependOlderPage(load);
}

function useOlderPages(
  page: OlderPages,
): Pick<FeedProps, 'loadingOlder' | 'onStartReached'> {
  const [loadingOlder, setLoadingOlder] = useState(false);

  const paging = useRef({
    start: newestPageStart(page.rows, page.pageLength ?? pageSize),
    inFlight: false,
  });

  const onStartReached = (): void =>
    void loadOlderPage({ ...page, paging: paging.current, setLoadingOlder });

  return { loadingOlder, onStartReached };
}

interface PagedFeedProps extends FeedProps {
  rows: readonly SessionUpdate[];
  // Each older page waits until the story sends it, so the story can mark the reader's place first.
  holdOlderPages?: boolean;
  pageLength?: number;
}

function drawFeed(
  props: FeedProps,
  feed: HeldFeed,
  older: Pick<FeedProps, 'loadingOlder' | 'onStartReached'>,
): React.JSX.Element {
  return (
    <Feed
      {...props}
      items={feed.view.items}
      historyCursor={feed.start}
      {...older}
    />
  );
}

function useHeldFeed(
  rows: readonly SessionUpdate[],
  pageLength: number | undefined,
): [HeldFeed, SetHeldFeed] {
  return useState(() =>
    viewOf(null, rows, {
      start: newestPageStart(rows, pageLength ?? pageSize),
      arrived: [],
    }),
  );
}

// Opens on the newest page and prepends an older one each time the reader nears the top, as the Session does.
export function PagedFeed({
  rows,
  holdOlderPages,
  pageLength,
  ...props
}: PagedFeedProps): React.JSX.Element {
  const [feed, setFeed] = useHeldFeed(rows, pageLength);

  useDeliversRows(rows, setFeed);

  const older = useOlderPages({ rows, setFeed, holdOlderPages, pageLength });

  return drawFeed(props, feed, older);
}
