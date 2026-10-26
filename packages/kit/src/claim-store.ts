import { listenerSet } from './listener-set';

/*
 * The engine under a Place (see place.ts), which is the only module that uses it. By default the newest claim holds the
 * place and an older one is not given it back when the newer lets go. With a precedence, the first claim holds it and
 * the others wait in line, unless one shows a value that outranks the holder's.
 */
export interface ClaimStore<Value> {
  claim: () => Claim<Value>;
  subscribe: (listener: () => void) => () => void;
  // The holding claim's value; undefined while nothing holds the place, or while the holder has shown nothing.
  current: () => Value | undefined;
  isHeld: () => boolean;
}

export interface Claim<Value> {
  // Shows the value as it is now: drawn while this claim holds the place, and offered for the holder's if it outranks it.
  show: (value: Value) => void;
  release: () => void;
}

// Whether a claim showing `next` may take the place from the one holding it.
export type Precedence<Value> = (
  holding: Value | undefined,
  next: Value,
) => boolean;

interface Held<Value> {
  value: Value | undefined;
}

interface Line<Value> {
  holder: Held<Value> | undefined;
  waiting: Held<Value>[];
  // Without a precedence the newest claim takes the place, and nothing waits.
  queues: boolean;
  precedence: Precedence<Value>;
  notify: () => void;
}

const waitsFor = <Value>(line: Line<Value>): boolean =>
  line.queues && line.holder !== undefined;

const holding = <Value>(line: Line<Value>): Value | undefined =>
  line.holder?.value;

function leaveLine<Value>(line: Line<Value>, own: Held<Value>): void {
  line.waiting = line.waiting.filter((held) => held !== own);
}

function outranks<Value>(line: Line<Value>, own: Held<Value>): boolean {
  if (own.value === undefined) return false;

  return (
    line.waiting.includes(own) && line.precedence(holding(line), own.value)
  );
}

function take<Value>(line: Line<Value>, own: Held<Value>): void {
  leaveLine(line, own);

  if (line.holder) line.waiting.unshift(line.holder);

  line.holder = own;
}

function show<Value>(line: Line<Value>, own: Held<Value>, value: Value): void {
  own.value = value;

  if (outranks(line, own)) take(line, own);

  if (line.holder === own) line.notify();
}

function release<Value>(line: Line<Value>, own: Held<Value>): void {
  leaveLine(line, own);

  if (line.holder !== own) return;

  line.holder = line.waiting.shift();
  line.notify();
}

function claimIn<Value>(line: Line<Value>): Claim<Value> {
  const own: Held<Value> = { value: undefined };

  if (waitsFor(line)) line.waiting.push(own);
  else line.holder = own;

  line.notify();

  return {
    show: (value) => show(line, own, value),
    release: () => release(line, own),
  };
}

const lineOf = <Value>(
  precedence: Precedence<Value> | undefined,
  notify: () => void,
): Line<Value> => ({
  holder: undefined,
  waiting: [],
  queues: precedence !== undefined,
  precedence: precedence ?? (() => false),
  notify,
});

export function createClaimStore<Value>(
  precedence?: Precedence<Value>,
): ClaimStore<Value> {
  const listeners = listenerSet();
  const line = lineOf(precedence, listeners.notify);

  return {
    claim: () => claimIn(line),
    subscribe: listeners.subscribe,
    current: () => holding(line),
    isHeld: () => line.holder !== undefined,
  };
}
