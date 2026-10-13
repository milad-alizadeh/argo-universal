// Browser storage, which AsyncStorage uses on the web, held in memory.
export function memoryStorage(): Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem' | 'clear'
> {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value) && undefined,
    removeItem: (key) => values.delete(key) && undefined,
    clear: () => values.clear(),
  };
}
