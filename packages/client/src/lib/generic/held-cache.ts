// Values by key that live while something holds them, and for a grace period after the last holder lets go; past `maxIdle` unheld values, the least recently used goes first.
export interface HeldCache<Value> {
  read: (key: string) => Value | undefined;
  write: (key: string, value: Value) => void;
  // Keeps the key's value until the returned release, plus the grace period.
  hold: (key: string) => () => void;
}

export interface HeldCacheLimits {
  graceMs: number;
  maxIdle: number;
}

interface Entry<Value> {
  value?: Value;
  holders: number;
  eviction?: ReturnType<typeof setTimeout>;
}

interface Store<Value> extends HeldCacheLimits {
  entries: Map<string, Entry<Value>>;
}

export function createHeldCache<Value>(
  limits: HeldCacheLimits,
): HeldCache<Value> {
  const store: Store<Value> = { ...limits, entries: new Map() };

  return {
    read: (key) => read(store, key),
    write: (key, value) => write(store, key, value),
    hold: (key) => hold(store, key),
  };
}

function entryOf<Value>(store: Store<Value>, key: string): Entry<Value> {
  const entry = store.entries.get(key) ?? { holders: 0 };
  store.entries.set(key, entry);

  return entry;
}

function markUsed<Value>(
  store: Store<Value>,
  key: string,
  entry: Entry<Value>,
): void {
  store.entries.delete(key);
  store.entries.set(key, entry);
}

function read<Value>(store: Store<Value>, key: string): Value | undefined {
  const entry = store.entries.get(key);

  if (entry) markUsed(store, key, entry);

  return entry?.value;
}

function startIdling<Value>(
  store: Store<Value>,
  key: string,
  entry: Entry<Value>,
): void {
  clearTimeout(entry.eviction);
  entry.eviction = setTimeout(() => store.entries.delete(key), store.graceMs);
  markUsed(store, key, entry);
  dropLeastRecentlyUsed(store);
}

function dropLeastRecentlyUsed<Value>(store: Store<Value>): void {
  const idle = [...store.entries].filter(([, entry]) => entry.holders === 0);

  for (const [key, entry] of idle.slice(0, idle.length - store.maxIdle)) {
    clearTimeout(entry.eviction);
    store.entries.delete(key);
  }
}

function write<Value>(store: Store<Value>, key: string, value: Value): void {
  const entry = entryOf(store, key);
  entry.value = value;

  if (entry.holders === 0) startIdling(store, key, entry);
}

function hold<Value>(store: Store<Value>, key: string): () => void {
  const entry = entryOf(store, key);
  clearTimeout(entry.eviction);
  entry.holders += 1;

  return (): void => {
    entry.holders -= 1;

    if (entry.holders === 0) startIdling(store, key, entry);
  };
}
