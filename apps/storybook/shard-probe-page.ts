/*
 * What the probe remembers about one browser page across the story files a worker runs in it.
 * The record lives on the page that holds the story iframes (the iframe's parent), because each
 * story file gets a fresh iframe but the Playwright page, and with it the mouse, persists.
 */

const RECENT_TESTS = 6;

const ID_LENGTH = 6;

export interface PointerSighting {
  x: number;
  y: number;
  type: string;
  at: number;
  ordinal: number;
}

export interface Sighting {
  ordinal: number;
  test: string;
  count: number;
}

export interface PageRecord {
  id: string;
  openedAt: number;
  ordinal: number;
  files: string[];
  recent: string[];
  current: string;
  trustedPointerEvents: number;
  pointer: PointerSighting | undefined;
  sightings: Record<string, Sighting>;
}

declare global {
  interface Window {
    __argoShardProbe?: PageRecord;
  }
}

function freshRecord(): PageRecord {
  return {
    id: crypto.randomUUID().slice(0, ID_LENGTH),
    openedAt: Date.now(),
    ordinal: 0,
    files: [],
    recent: [],
    current: '',
    trustedPointerEvents: 0,
    pointer: undefined,
    sightings: {},
  };
}

function host(): Window {
  try {
    return window.parent.document.defaultView ?? window;
  } catch {
    return window;
  }
}

export function pageRecord(): PageRecord {
  const page = host();
  page.__argoShardProbe ??= freshRecord();

  return page.__argoShardProbe;
}

export function iframesInPage(): number {
  try {
    return window.parent.document.querySelectorAll('iframe').length;
  } catch {
    return -1;
  }
}

export function noteTest(file: string, name: string): PageRecord {
  const record = pageRecord();
  record.ordinal += 1;
  record.current = `${file} > ${name}`;
  record.recent = [...record.recent, record.current].slice(-RECENT_TESTS);

  if (!record.files.includes(file)) record.files.push(file);

  return record;
}

export function notePointer(x: number, y: number, type: string): void {
  const record = pageRecord();
  record.trustedPointerEvents += 1;
  record.pointer = { x, y, type, at: Date.now(), ordinal: record.ordinal };
}

export function noteSighting(kind: string): void {
  const { sightings, ordinal, current } = pageRecord();
  const count = (sightings[kind]?.count ?? 0) + 1;
  sightings[kind] = { ordinal, test: current, count };
}
