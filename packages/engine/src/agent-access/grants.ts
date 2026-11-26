import type { OperationGrant } from '@repo/contracts/operations';
import { operations } from '@repo/contracts/operations';
import type { Database } from '@repo/db';
import { operationGrant, project } from '@repo/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import {
  writeDatabaseJobAndWaitForCommit,
  type StorageTransaction,
  type WriterActorRef,
  type WriterJob,
} from '../storage';

// One Always allow choice: Sessions started from this Project run this Operation into the target Project without asking.
export type GrantKey = Pick<
  OperationGrant,
  'projectId' | 'operationId' | 'targetProjectId'
>;

// Always allow grants, as the Session scope reads and records them, and the Project names its card states (ADR-0044).
export type OperationGrants = {
  granted: (key: GrantKey) => boolean;
  grant: (key: GrantKey) => Promise<void>;
  projectName: (projectId: string) => string;
};

export function storedOperationGrants(
  database: Database,
  writer: WriterActorRef,
): OperationGrants {
  return {
    granted: (key) => hasOperationGrant(database, key),
    grant: (key) => writeDatabaseJobAndWaitForCommit(writer, new GrantJob(key)),
    projectName: (projectId) => readProjectName(database, projectId),
  };
}

// A Project that is gone is named by its id.
function readProjectName(database: Database, projectId: string): string {
  return (
    database
      .select({ name: project.name })
      .from(project)
      .where(eq(project.id, projectId))
      .get()?.name ?? projectId
  );
}

function hasOperationGrant(database: Database, key: GrantKey): boolean {
  return (
    database
      .select({ projectId: operationGrant.projectId })
      .from(operationGrant)
      .where(grantRow(key))
      .get() !== undefined
  );
}

const targetProject = alias(project, 'target_project');

export function readOperationGrants(database: Database): OperationGrant[] {
  return database
    .select({
      projectId: operationGrant.projectId,
      projectName: project.name,
      operationId: operationGrant.operationId,
      targetProjectId: operationGrant.targetProjectId,
      targetProjectName: targetProject.name,
      createdAt: operationGrant.createdAt,
    })
    .from(operationGrant)
    .innerJoin(project, eq(project.id, operationGrant.projectId))
    .innerJoin(
      targetProject,
      eq(targetProject.id, operationGrant.targetProjectId),
    )
    .orderBy(asc(operationGrant.createdAt), asc(operationGrant.operationId))
    .all()
    .map((row) => ({ ...row, label: operationLabel(row.operationId) }));
}

export async function revokeOperationGrant(
  writer: WriterActorRef,
  key: GrantKey,
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
  targetProjectId,
}: GrantKey): ReturnType<typeof and> =>
  and(
    eq(operationGrant.projectId, projectId),
    eq(operationGrant.operationId, operationId),
    eq(operationGrant.targetProjectId, targetProjectId),
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
  public constructor(private readonly key: GrantKey) {}
  public describe(): string {
    return 'revoke an Always allow grant';
  }
  public commit(transaction: StorageTransaction): void {
    transaction.delete(operationGrant).where(grantRow(this.key)).run();
  }
}
