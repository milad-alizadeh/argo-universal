import { unrecordedBy } from './pull-fix-events';
import {
  all,
  isCountRow,
  keyOf,
  keysText,
  run,
  waitingRowsOf,
  where,
  type Execute,
  type FixStore,
} from './pull-fix-rows';

// The Prompts Auto-fix sent on one pull request, as `pull-fix-rows.ts` describes them.

export const sentOf =
  (execute: Execute): FixStore['sent'] =>
  async (link, head) => {
    const { rows } = await execute(
      all(
        `SELECT COUNT(*) FROM pull_auto_fix_prompts WHERE ${where} AND head = ?`,
        [...keyOf(link), head],
      ),
    );

    return rows.find(isCountRow)?.[0] ?? 0;
  };

export const sentPromptBy =
  (execute: Execute): FixStore['sentPrompt'] =>
  async (link, { head, keys, queuedId }) => {
    await execute(
      run(
        'INSERT INTO pull_auto_fix_prompts (project_id, session_id, repository, number, head, queued_id, event_keys) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [...keyOf(link), head, queuedId, keysText(keys)],
      ),
    );
  };

export const waitingOf =
  (execute: Execute): FixStore['waiting'] =>
  async (link) =>
    waitingRowsOf(
      await execute(
        all(
          `SELECT head, queued_id, event_keys FROM pull_auto_fix_prompts WHERE ${where} AND queued_id IS NOT NULL`,
          keyOf(link),
        ),
      ),
    );

const byQueuedId = `${where} AND queued_id = ?`;

export const withdrawnBy =
  (execute: Execute): FixStore['withdrawn'] =>
  async (link, prompt) => {
    await execute(
      run(`DELETE FROM pull_auto_fix_prompts WHERE ${byQueuedId}`, [
        ...keyOf(link),
        prompt.queuedId,
      ]),
    );
    await unrecordedBy(execute)(link, prompt.head, prompt.keys);
  };

export const startedBy =
  (execute: Execute): FixStore['started'] =>
  async (link, prompt) => {
    await execute(
      run(
        `UPDATE pull_auto_fix_prompts SET queued_id = NULL WHERE ${byQueuedId}`,
        [...keyOf(link), prompt.queuedId],
      ),
    );
  };

// Turning Auto-fix on starts the count again on this head.
export async function clearedOn(
  execute: Execute,
  link: Parameters<FixStore['sent']>[0],
  head: string,
): Promise<void> {
  await execute(
    run(`DELETE FROM pull_auto_fix_prompts WHERE ${where} AND head = ?`, [
      ...keyOf(link),
      head,
    ]),
  );
}

// What the store writes of the Prompts Auto-fix sent.
export const sentWritersOf = (
  execute: Execute,
): Pick<FixStore, 'sentPrompt' | 'withdrawn' | 'started'> => ({
  sentPrompt: sentPromptBy(execute),
  withdrawn: withdrawnBy(execute),
  started: startedBy(execute),
});
