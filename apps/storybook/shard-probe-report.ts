import { pendingFrames } from './shard-probe-input';
import { iframesInPage, type PageRecord } from './shard-probe-page';
import { elapsed, timelineEvents } from './shard-probe-timeline';

const NAMED_ANIMATIONS = 5;

const MS_PER_SECOND = 1000;

// What the page looked like when the story started, taken before the story draws anything.
export interface StartSnapshot {
  lines: string[];
}

function animationNames(): string {
  return document
    .getAnimations()
    .slice(0, NAMED_ANIMATIONS)
    .map((animation) =>
      animation instanceof CSSAnimation
        ? animation.animationName
        : 'transition',
    )
    .join(', ');
}

function pointerLine(record: PageRecord): string {
  const { pointer } = record;

  if (!pointer) {
    return 'pointer at story start: no trusted pointer event has reached this page yet';
  }

  const age = Date.now() - pointer.at;

  return `pointer at story start: last trusted ${pointer.type} at (${pointer.x}, ${pointer.y}), ${age}ms ago, during test #${pointer.ordinal}`;
}

export function snapshotStart(record: PageRecord): StartSnapshot {
  const active = document.activeElement?.tagName ?? 'none';
  const animations = `${document.getAnimations().length} [${animationNames()}]`;

  return {
    lines: [
      pointerLine(record),
      `trusted pointer events this page has had: ${record.trustedPointerEvents}`,
      `active element: ${active}; viewport ${innerWidth}x${innerHeight}`,
      `animations running: ${animations}; frames pending: ${pendingFrames()}`,
      `iframes in the page: ${iframesInPage()}`,
    ],
  };
}

function sightingLines(record: PageRecord): string[] {
  return Object.entries(record.sightings).map(
    ([kind, seen]) =>
      `${kind}: seen ${seen.count} times; last ${record.ordinal - seen.ordinal} tests ago in ${seen.test}`,
  );
}

function pageLines(record: PageRecord): string[] {
  const open = Math.round((Date.now() - record.openedAt) / MS_PER_SECOND);
  const before = record.recent.slice(0, -1).join(' | ');

  return [
    `page ${record.id}: test #${record.ordinal} in this page, ${record.files.length} files so far, open ${open}s`,
    `previous tests in this page, oldest first: ${before}`,
  ];
}

export function formatReport(record: PageRecord, start: StartSnapshot): string {
  const timeline = timelineEvents().map(
    (event) => `  +${event.at}ms ${event.kind} ${event.detail}`,
  );

  return [
    `[shard-probe] ${record.current} failed at +${elapsed()}ms`,
    ...pageLines(record),
    ...start.lines,
    ...sightingLines(record),
    'timeline since story start:',
    ...timeline,
  ].join('\n');
}
