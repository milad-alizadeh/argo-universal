/*
 * Registers `value` under `key`, returning what unregisters it: only while it is still the one there, so a newer
 * registration under the same key, made before the old one's cleanup ran, stays.
 */
export function registered<Key, Value>(
  map: Map<Key, Value>,
  key: Key,
  value: Value,
): () => void {
  map.set(key, value);

  return (): void => {
    if (map.get(key) === value) map.delete(key);
  };
}
