import { notePointer, noteSighting } from './shard-probe-page';
import { REPORT_PREFIX } from './shard-probe-report-prefix';
import { addEvent, describeNode } from './shard-probe-timeline';

// A trusted event is the browser's own (Playwright's mouse); a synthetic one is the story's userEvent.
const INPUT_EVENTS = [
  'pointermove',
  'pointerenter',
  'pointerleave',
  'pointerdown',
  'pointerup',
  'click',
  'focusin',
  'focusout',
];

const WATCHED_MESSAGES = [
  { kind: 'legend-list-zero-height', needle: 'List height is 0' },
  { kind: 'resize-observer-loop', needle: 'ResizeObserver loop' },
];

const MESSAGE_LENGTH = 80;

const LISTEN = { capture: true, passive: true };

function pointOf(event: Event): string {
  return event instanceof MouseEvent
    ? ` at (${event.clientX}, ${event.clientY})`
    : '';
}

function relatedOf(event: Event): string {
  return event instanceof MouseEvent || event instanceof FocusEvent
    ? ` related=${describeNode(event.relatedTarget)}`
    : '';
}

function notePointerEvent(event: Event): void {
  if (event.isTrusted && event instanceof PointerEvent) {
    notePointer(event.clientX, event.clientY, event.type);
  }
}

function recordInput(event: Event): void {
  const origin = event.isTrusted ? 'trusted' : 'synthetic';
  const target = describeNode(event.target);
  addEvent(
    event.type,
    `${origin} ${target}${pointOf(event)}${relatedOf(event)}`,
  );
  notePointerEvent(event);
}

export function listenForInput(): () => void {
  for (const type of INPUT_EVENTS) {
    window.addEventListener(type, recordInput, LISTEN);
  }

  return (): void => {
    for (const type of INPUT_EVENTS) {
      window.removeEventListener(type, recordInput, LISTEN);
    }
  };
}

function noteMessage(text: string): void {
  if (text.startsWith(REPORT_PREFIX)) return;

  const hits = WATCHED_MESSAGES.filter(({ needle }) => text.includes(needle));

  for (const { kind } of hits) {
    noteSighting(kind);
    addEvent(kind, text.slice(0, MESSAGE_LENGTH));
  }
}

function recordError(event: ErrorEvent): void {
  noteMessage(event.message);
}

// A console call the story made must never throw because of the probe.
function textOf(args: unknown[]): string {
  try {
    return args.map(String).join(' ');
  } catch {
    return '';
  }
}

function watchConsole(method: 'warn' | 'error'): void {
  const original = console[method].bind(console);
  console[method] = (...args: unknown[]): void => {
    original(...args);
    noteMessage(textOf(args));
  };
}

export function listenForMessages(): () => void {
  watchConsole('warn');
  watchConsole('error');
  window.addEventListener('error', recordError);

  return (): void => window.removeEventListener('error', recordError);
}
