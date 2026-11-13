import { ChangeFilesPage, SessionDiffOutput } from '@repo/contracts';
import type { ZodType } from 'zod';
import {
  type ChangesSource,
  type RemoteChange,
  remoteChanges,
} from '#features/changes';
import { changeKey, type SessionPullRequest } from '#features/sessions';
import { changesPluginId } from './change-associations';
import { referenceOfChange } from './change-reference';
import type { OperationRunner } from './page-calls-ports';
import type { ChangesContext } from './use-session-pull-requests';

// The files and diff of one Change, read from the Plugin that supplied it.
export type ChangeFilesSource = (change: SessionPullRequest) => ChangesSource;

type Runner = Pick<OperationRunner, 'run'>;

type Call = {
  runner: Runner;
  scope: ChangesContext;
  operation: 'files' | 'diff';
  args: Readonly<Record<string, string | number>>;
};

// The Operation's answer, checked against what the App draws; one that does not fit is a failed read.
async function ask<Answer>(
  { runner, scope, operation, args }: Call,
  schema: ZodType<Answer>,
): Promise<Answer> {
  const { result } = await runner.run({
    pluginId: changesPluginId,
    operation,
    args,
    ...scope,
  });

  return schema.parse(result);
}

const keyOf = (scope: ChangesContext, change: SessionPullRequest): string[] => [
  'change-files',
  scope.sessionId,
  changeKey(change),
  change.head ?? '',
];

const filesOf =
  (
    call: Omit<Call, 'operation' | 'args'>,
    reference: string,
  ): RemoteChange['readFiles'] =>
  (cursor) =>
    ask(
      {
        ...call,
        operation: 'files',
        args: cursor === null ? { reference } : { reference, cursor },
      },
      ChangeFilesPage,
    );

const diffOf =
  (
    call: Omit<Call, 'operation' | 'args'>,
    reference: string,
  ): RemoteChange['readDiff'] =>
  (path) =>
    ask(
      { ...call, operation: 'diff', args: { reference, path } },
      SessionDiffOutput,
    );

/*
 * A Change's files are the Plugin's own `files` and `diff` Operations, run for the Session's Project and Session and
 * answering for the Change's repository, base and head; the Session's Checkout is never asked (ADR-0052). A failed read
 * rejects, and the Inspector says why the files are unavailable instead of drawing others.
 */
export const remoteOf = (
  runner: Runner,
  scope: ChangesContext,
  change: SessionPullRequest,
): RemoteChange => ({
  key: keyOf(scope, change),
  readFiles: filesOf({ runner, scope }, referenceOfChange(change)),
  readDiff: diffOf({ runner, scope }, referenceOfChange(change)),
});

export const changeFilesOf =
  (runner: Runner, scope: ChangesContext): ChangeFilesSource =>
  (change) =>
    remoteChanges(remoteOf(runner, scope, change));
