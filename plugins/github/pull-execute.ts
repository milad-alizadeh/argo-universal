import type { Argo } from '@argo/plugin-kit';
import { run, type Execute } from './pull-fix-rows';

// The Plugin's own storage, as the automation records use it.
export type Storage = Pick<Argo, 'storage'>;

// Each statement waits for the tables it names, then runs.
export function executingOver(
  { storage }: Storage,
  tables: readonly string[],
): Execute {
  let ready: Promise<unknown> | undefined;

  return async (statement) => {
    ready ??= Promise.all(tables.map((sql) => storage.execute(run(sql, []))));
    await ready;

    return storage.execute(statement);
  };
}
