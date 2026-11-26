import type { OperationGrant } from '@repo/contracts/operations';
import { operations, type OperationId } from '@repo/contracts/operations';
import type { Database } from '@repo/db';
import { operationGrant, project } from '@repo/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import {
  writeDatabaseJobAndWaitForCommit,
  type StorageTransaction,
  type WriterActorRef,
  type WriterJob,
} from '../storage';

// One Always allow choice: Sessions in this Project run this Operation without a Permission request.
export type GrantKey = { projectId: string; operationId: OperationId };

// Always allow grants, as the Session scope reads and records them (ADR-0044, Always allow).
export type OperationGrants = {
  granted: (key: GrantKey) => boolean;
  grant: (key: GrantKey) => Promise<void>;
};

export function storedOperationGrants(
  database: Database,
  writer: WriterActorRef,
): OperationGrants {
  return {
    granted: (key) => hasOperationGrant(database, key),
    grant: (key) => writeDatabaseJobAndWaitForCommit(writer, new GrantJob(key)),
  };
}

function hasOperationGrant(
  database: Database,
  { projectId, operationId }: GrantKey,
): boolean {
  return (
    database
      .select({ projectId: operationGrant.projectId })
      .from(operationGrant)
      .where(grantRow({ projectId, operationId }))
      .get() !== undefined
  );
}

// Every grant, with its Project's name and its Operation's label, in the order they were given.
export function readOperationGrants(database: Database): OperationGrant[] {
  return database
    .select({
      projectId: operationGrant.projectId,
      projectName: project.name,
      operationId: operationGrant.operationId,
      createdAt: operationGrant.createdAt,
    })
    .from(operationGrant)
    .innerJoin(project, eq(project.id, operationGrant.projectId))
    .orderBy(asc(operationGrant.createdAt), asc(operationGrant.operationId))
    .all()
    .map((row) => ({ ...row, label: operationLabel(row.operationId) }));
}

export async function revokeOperationGrant(
  writer: WriterActorRef,
  key: { projectId: string; operationId: string },
): Promise<Record<string, never>> {
  await writeDatabaseJobAndWaitForCommit(writer, new RevokeJob(key));

  return {};
}

// A grant outlives an Operation the registry no longer has; it then shows its id.
const operationLabel = (id: string): string =>
  Object.values(operations).find((operation) => operation.id === id)?.label ??
  id;

const grantRow = ({
  projectId,
  operationId,
}: {
  projectId: string;
  operationId: string;
}): ReturnType<typeof and> =>
  and(
    eq(operationGrant.projectId, projectId),
    eq(operationGrant.operationId, operationId),
  );

class GrantJob implements WriterJob {
  public constructor(private readonly key: GrantKey) {}
  public describe(): string {
    return 'record an Always allow grant';
  }
  public commit(transaction: StorageTransaction): void {
    transaction
      .insert(operationGrant)
      .values(this.key)
      .onConflictDoNothing()
      .run();
  }
}

class RevokeJob implements WriterJob {
  public constructor(
    private readonly key: { projectId: string; operationId: string },
  ) {}
  public describe(): string {
    return 'revoke an Always allow grant';
  }
  public commit(transaction: StorageTransaction): void {
    transaction.delete(operationGrant).where(grantRow(this.key)).run();
  }
}
