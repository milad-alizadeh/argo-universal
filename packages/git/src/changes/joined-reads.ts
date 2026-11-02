// The list asks for every file in view at once; this is how long a read waits for the rest of them.
const joinWindowMs = 5;

type Read<Value> = () => Promise<Value>;

const afterJoinWindow = <Value>(
  key: string,
  waiting: Map<string, Promise<Value>>,
  read: Read<Value>,
): Promise<Value> =>
  new Promise((resolve) => {
    setTimeout(() => {
      waiting.delete(key);
      resolve(read());
    }, joinWindowMs);
  });

/*
 * Reads asked for together share one, and it starts only once the window closes. A read that has started takes no one
 * else, so an answer never predates its question: a file changed just before a refresh is always seen.
 */
export function joinedReads<Value>(): (
  key: string,
  read: Read<Value>,
) => Promise<Value> {
  const waiting = new Map<string, Promise<Value>>();

  return (key, read) => {
    const joined = waiting.get(key) ?? afterJoinWindow(key, waiting, read);

    waiting.set(key, joined);

    return joined;
  };
}
