import { pendingFrames } from './shard-probe-frames';
import { iframesInPage, type PageRecord } from './shard-probe-page';
import { REPORT_PREFIX } from './shard-probe-report-prefix';
import { elapsed, timelineEvents } from './shard-probe-timeline';

const NAMED_ANIMATIONS = 5;

const MS_PER_SECOND = 1000;

function animationNames(animations: Animation[]): string {
  return animations
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

  const age = Date.now() - pointer.atEpochMs;

  return `pointer at story start: last trusted ${pointer.type} at (${pointer.x}, ${pointer.y}), ${age}ms ago, during test #${pointer.ordinal}`;
}

// What the page looked like when the story started, taken before the story draws anything.
export function snapshotStart(record: PageRecord): string[] {
  const active = document.activeElement?.tagName ?? 'none';
  const running = document.getAnimations();
  const animations = `${running.length} [${animationNames(running)}]`;

  return [
    pointerLine(record),
    `trusted pointer events this page has had: ${record.trustedPointerEvents}`,
    `active element: ${active}; viewport ${innerWidth}x${innerHeight}`,
    `animations running: ${animations}; frames pending: ${pendingFrames()}`,
    `iframes in the page: ${iframesInPage()}`,
  ];
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

export function formatReport(record: PageRecord, start: string[]): string {
  const timeline = timelineEvents().map(
    (event) => `  +${event.at}ms ${event.kind} ${event.detail}`,
  );

  return [
    `${REPORT_PREFIX} ${record.current} failed at +${elapsed()}ms`,
    ...pageLines(record),
    ...start,
    ...sightingLines(record),
    'timeline since story start:',
    ...timeline,
  ].join('\n');
}

// A probe that throws fails every story, so a snapshot that cannot be taken is reported instead.
export function safeSnapshot(record: PageRecord): string[] {
  try {
    return snapshotStart(record);
  } catch (error) {
    return [`start snapshot failed: ${String(error)}`];
  }
}
