import { Turn } from '@repo/contracts';
import { z } from 'zod';

// SQLite JSON columns reach readers as raw text; queued Turns are already typed.
export function decodeStoredTurn(
  row: Omit<Turn, 'error' | 'usage'> & { error?: unknown; usage?: unknown },
): Turn {
  return Turn.parse({
    ...row,
    error: row.error === null ? null : JSON.parse(z.string().parse(row.error)),
    usage: row.usage === null ? null : JSON.parse(z.string().parse(row.usage)),
  });
}
