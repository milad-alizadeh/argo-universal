// The events one story's page saw, stamped from the start of the story, kept in a bounded buffer.

const MAX_EVENTS = 400;

const TEXT_LENGTH = 24;

const REMOVAL_FILTER =
  '[role],[aria-label],[data-testid],[data-state],[data-radix-popper-content-wrapper]';

const DESCRIBING = ['role', 'aria-label', 'data-testid', 'data-state'];

export interface TimelineEvent {
  at: number;
  kind: string;
  detail: string;
}

let origin = performance.now();

let events: TimelineEvent[] = [];

export function startTimeline(): void {
  origin = performance.now();
  events = [];
}

export function elapsed(): number {
  return Math.round(performance.now() - origin);
}

export function addEvent(kind: string, detail: string): void {
  events.push({ at: elapsed(), kind, detail });

  if (events.length > MAX_EVENTS) events.shift();
}

export function timelineEvents(): readonly TimelineEvent[] {
  return events;
}

function attributeOf(node: Element, name: string): string[] {
  const value = node.getAttribute(name);

  return value === null ? [] : [`${name}=${value}`];
}

export function describeNode(node: EventTarget | null): string {
  if (!(node instanceof Element))
    return node === null ? 'none' : node.constructor.name;
  const attributes = DESCRIBING.flatMap((name) => attributeOf(node, name));

  return [node.tagName.toLowerCase(), ...attributes].join(' ');
}

function isWorthReporting(node: Element): boolean {
  return (
    node.matches(REMOVAL_FILTER) || node.querySelector(REMOVAL_FILTER) !== null
  );
}

function recordRemoval(node: Node): void {
  if (!(node instanceof Element) || !isWorthReporting(node)) return;
  const text = node.textContent.slice(0, TEXT_LENGTH);
  addEvent('removed', `${describeNode(node)} text="${text}"`);
}

function recordMutation(mutation: MutationRecord): void {
  for (const node of mutation.removedNodes) recordRemoval(node);

  if (mutation.type !== 'attributes') return;
  const target = describeNode(mutation.target);
  addEvent('state', `${target} was ${mutation.oldValue}`);
}

export function observeMutations(): MutationObserver {
  const observer = new MutationObserver((records: MutationRecord[]): void => {
    for (const mutation of records) recordMutation(mutation);
  });

  observer.observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-state'],
    attributeOldValue: true,
  });

  return observer;
}
