// Values by key that live while something holds them, and for a grace period after the last holder lets go.
export interface HeldCache<Value> {
  read: (key: string) => Value | undefined;
  write: (key: string, value: Value) => void;
  // Keeps the key's value until the returned release, plus the grace period.
  hold: (key: string) => () => void;
}

interface Entry<Value> {
  value?: Value;
  holders: number;
  eviction?: ReturnType<typeof setTimeout>;
}

interface Store<Value> {
  entries: Map<string, Entry<Value>>;
  graceMs: number;
}

export function createHeldCache<Value>(graceMs: number): HeldCache<Value> {
  const store: Store<Value> = { entries: new Map(), graceMs };
  return {
    read: (key) => store.entries.get(key)?.value,
    write: (key, value) => write(store, key, value),
    hold: (key) => hold(store, key),
  };
}

function entryOf<Value>(store: Store<Value>, key: string): Entry<Value> {
  const entry = store.entries.get(key) ?? { holders: 0 };
  store.entries.set(key, entry);
  return entry;
}

function evictLater<Value>(
  store: Store<Value>,
  key: string,
  entry: Entry<Value>,
): void {
  clearTimeout(entry.eviction);
  entry.eviction = setTimeout(() => store.entries.delete(key), store.graceMs);
}

function write<Value>(store: Store<Value>, key: string, value: Value): void {
  const entry = entryOf(store, key);
  entry.value = value;
  if (entry.holders === 0) evictLater(store, key, entry);
}

function hold<Value>(store: Store<Value>, key: string): () => void {
  const entry = entryOf(store, key);
  clearTimeout(entry.eviction);
  entry.holders += 1;
  return (): void => {
    entry.holders -= 1;
    if (entry.holders === 0) evictLater(store, key, entry);
  };
}
