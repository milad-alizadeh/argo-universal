import type { TodoListSetting } from '@repo/contracts';
import type { Database } from '@repo/db';
import { serverSettings } from '@repo/db/schema';
import {
  writeDatabaseJobAndWaitForCommit,
  type StorageTransaction,
  type WriterActorRef,
  type WriterJob,
} from '../storage';

// Whether Sessions keep a checklist (ADR-0053): on until the person turns it off.
export function readTodoList(database: Database): TodoListSetting {
  const row = database.select().from(serverSettings).get();

  return { enabled: row?.todoList ?? true };
}

export async function setTodoList(
  database: Database,
  writer: WriterActorRef,
  enabled: boolean,
): Promise<TodoListSetting> {
  await writeDatabaseJobAndWaitForCommit(writer, new TodoListJob(enabled));

  return readTodoList(database);
}

class TodoListJob implements WriterJob {
  public constructor(private readonly enabled: boolean) {}

  public describe(): string {
    return 'change the Todo list setting';
  }

  public commit(transaction: StorageTransaction): void {
    const row = { singleton: 1, todoList: this.enabled };
    transaction
      .insert(serverSettings)
      .values(row)
      .onConflictDoUpdate({ target: serverSettings.singleton, set: row })
      .run();
  }
}
