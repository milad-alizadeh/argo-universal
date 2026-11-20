import { z } from 'zod';

const record = z.tuple([
  z.string().regex(/^\d+$/),
  z.uuid(),
  z.enum(['request', 'acquire', 'release', 'gone']),
]);

type Record = z.infer<typeof record>;

function apply(pending: Set<string>, [, token, event]: Record): void {
  if (event === 'request') pending.add(token);

  if (['release', 'gone'].includes(event)) pending.delete(token);
}

function* entries(journal: string): Generator<Record> {
  for (const line of journal.split('\n')) {
    const entry = record.safeParse(line.split(' '));

    if (entry.success) yield entry.data;
  }
}

// One append registers a request across processes, even within the same millisecond.
export function predecessors(journal: string, own: string): string[] {
  const pending = new Set<string>();

  for (const entry of entries(journal)) {
    if (entry[1] === own) break;
    apply(pending, entry);
  }

  return [...pending];
}
