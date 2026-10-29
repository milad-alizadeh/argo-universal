export interface TransparencySource {
  read: () => Promise<boolean>;
  subscribe: (listener: (reduced: boolean) => void) => () => void;
}

export interface TransparencyStore {
  subscribe: (listener: () => void) => () => void;
  snapshot: () => boolean;
}

interface TransparencyState {
  source: TransparencySource;
  reduced: boolean;
  sequence: number;
  listeners: Set<() => void>;
  stop?: () => void;
}

export function createTransparencyStore(
  source: TransparencySource,
): TransparencyStore {
  const state: TransparencyState = {
    source,
    reduced: true,
    sequence: 0,
    listeners: new Set(),
  };

  return {
    subscribe: (listener) => subscribe(state, listener),
    snapshot: () => state.reduced,
  };
}

function publish(state: TransparencyState, value: boolean): void {
  state.reduced = value;

  for (const listener of state.listeners) listener();
}

function update(state: TransparencyState, value: boolean): void {
  state.sequence += 1;
  publish(state, value);
}

function subscribe(state: TransparencyState, listener: () => void): () => void {
  state.listeners.add(listener);

  if (!state.stop) start(state);

  return () => unsubscribe(state, listener);
}

function start(state: TransparencyState): void {
  const revision = state.sequence;
  state.stop = state.source.subscribe((value) => update(state, value));
  void state.source.read().then(
    (value) => publishRead(state, value, revision),
    () => publishRead(state, true, revision),
  );
}

function publishRead(
  state: TransparencyState,
  value: boolean,
  revision: number,
): void {
  if (state.sequence === revision) publish(state, value);
}

function unsubscribe(state: TransparencyState, listener: () => void): void {
  state.listeners.delete(listener);

  if (state.listeners.size === 0) reset(state);
}

function reset(state: TransparencyState): void {
  state.stop?.();
  state.stop = undefined;
  state.reduced = true;
  state.sequence += 1;
}
