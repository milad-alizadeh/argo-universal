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

export function createHeldCache<Value>(graceMs: number): HeldCache<Value> {
  const entries = new Map<string, Entry<Value>>();
  const entryOf = (key: string): Entry<Value> => {
    const entry = entries.get(key) ?? { holders: 0 };
    entries.set(key, entry);
    return entry;
  };
  const evictLater = (key: string, entry: Entry<Value>): void => {
    clearTimeout(entry.eviction);
    entry.eviction = setTimeout(() => entries.delete(key), graceMs);
  };
  return {
    read: (key) => entries.get(key)?.value,
    write: (key, value) => {
      const entry = entryOf(key);
      entry.value = value;
      if (entry.holders === 0) evictLater(key, entry);
    },
    hold: (key) => {
      const entry = entryOf(key);
      clearTimeout(entry.eviction);
      entry.holders += 1;
      return (): void => {
        entry.holders -= 1;
        if (entry.holders === 0) evictLater(key, entry);
      };
    },
  };
}
