import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveExecutable } from '@repo/executables';
import { onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { projectPath, type Host } from './session-changes-project.test.mocks';

export const committedFileName = 'committed.txt';

export const secondFileName = 'second.txt';

export async function editTurn(): Promise<{
  host: Host;
  sessionId: string;
  checkout: string;
  releaseEdit: () => void;
  editSettled: Promise<void>;
  releaseTurn: () => void;
}> {
  const edit = Promise.withResolvers<void>();
  const editEntered = Promise.withResolvers<void>();
  const turn = Promise.withResolvers<void>();
  const turnEntered = Promise.withResolvers<void>();

  onTestFinished(() => {
    edit.resolve();
    turn.resolve();
  });

  const host = await startAcpEngine({
    steps: [
      { type: 'gate', waitFor: edit.promise, entered: editEntered },
      {
        type: 'update',
        update: {
          sessionUpdate: 'tool_call',
          toolCallId: 'edit-1',
          title: 'Edit',
          kind: 'edit',
          status: 'in_progress',
        },
      },
      {
        type: 'update',
        update: {
          sessionUpdate: 'tool_call_update',
          toolCallId: 'edit-1',
          status: 'completed',
        },
      },
      { type: 'gate', waitFor: turn.promise, entered: turnEntered },
    ],
  });

  const checkout = await projectPath(host);
  const created = await host.caller.session.new(emptySessionInput);

  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Edit' }],
  });
  await editEntered.promise;

  return {
    host,
    sessionId: created.sessionId,
    checkout,
    releaseEdit: () => edit.resolve(),
    editSettled: turnEntered.promise,
    releaseTurn: () => turn.resolve(),
  };
}

export async function mainCheckoutSession(): Promise<{
  host: Host;
  sessionId: string;
  checkout: string;
}> {
  const host = await startAcpEngine({ steps: [] });
  const checkout = await projectPath(host);
  const created = await host.caller.session.new(emptySessionInput);

  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Inspect changes' }],
  });
  await waitForAcpSnapshot(
    host,
    created.sessionId,
    (snapshot) => snapshot.state === 'idle',
  );
  writeFileSync(join(checkout, 'first.txt'), 'first\n');

  return { host, sessionId: created.sessionId, checkout };
}

export async function twoFileSession(): Promise<{
  host: Host;
  sessionId: string;
}> {
  const session = await mainCheckoutSession();

  writeFileSync(join(session.checkout, secondFileName), 'second\n');

  return session;
}

export async function threeLineSession(): Promise<{
  host: Host;
  sessionId: string;
}> {
  const session = await mainCheckoutSession();

  writeFileSync(join(session.checkout, 'first.txt'), 'one\ntwo\nthree\n');

  return session;
}

export async function committedWorktreeSession(): Promise<{
  host: Host;
  sessionId: string;
  branch: string;
}> {
  const host = await startAcpEngine({ steps: [] });
  const project = await projectPath(host);

  execFileSync(resolveExecutable('git'), ['branch', '-m', 'main', 'trunk'], {
    cwd: project,
  });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    checkout: { type: 'worktree', baseBranch: 'feature' },
  });

  const snapshot = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (value) => value.checkout.path !== '',
  );

  const branch = snapshot.checkout.branch;

  if (!branch) throw new Error('No Session branch');

  writeFileSync(
    join(snapshot.checkout.path, committedFileName),
    'from Session\n',
  );
  execFileSync(resolveExecutable('git'), ['add', committedFileName], {
    cwd: snapshot.checkout.path,
  });
  execFileSync(
    resolveExecutable('git'),
    [
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      'commit',
      '-q',
      '-m',
      'Session work',
    ],
    { cwd: snapshot.checkout.path },
  );

  return { host, sessionId: created.sessionId, branch };
}
