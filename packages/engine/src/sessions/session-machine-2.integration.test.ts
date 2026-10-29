import type {
  RequestPermissionResponse,
  CreateElicitationResponse,
} from '@agentclientprotocol/sdk';
import { permissionOptions } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import {
  fileQuestion,
  permissionTool,
  nextPermissionTool,
  optionId,
  promptInput,
  mixedQuestions,
} from './session-machine.test.mocks';

function requireValue<T>(value: T | null, message: string): T {
  if (!value) throw new Error(message);

  return value;
}

it('answers only the head Permission while concurrent Elicitation and other Permissions remain visible', async () => {
  const permissions: RequestPermissionResponse[] = [];
  const elicitations: CreateElicitationResponse[] = [];
  const host = await startAcpEngine(mixedQuestions(permissions, elicitations));
  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({ ...created, prompt: promptInput });

  const first = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (snapshot) =>
      snapshot.pendingPermission !== null &&
      snapshot.pendingElicitation !== null,
  );

  expect(first).toMatchObject({
    state: 'requires_action',
    pendingPermission: {
      toolCallId: permissionTool,
      title: 'Read a file',
      options: permissionOptions,
    },
    pendingElicitation: { message: fileQuestion },
  });
  await expect(
    host.caller.session.answerPermission({
      ...created,
      requestId: 'not-the-head',
      optionId,
    }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });

  const firstPermission = requireValue(
    first.pendingPermission,
    'No first Permission',
  );

  await host.caller.session.answerPermission({
    ...created,
    requestId: firstPermission.requestId,
    optionId,
  });

  const second = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (snapshot) => snapshot.pendingPermission?.toolCallId === nextPermissionTool,
  );

  const secondPermission = requireValue(
    second.pendingPermission,
    'No second Permission',
  );

  await host.caller.session.answerPermission({
    ...created,
    requestId: secondPermission.requestId,
    optionId,
  });

  const question = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (snapshot) => snapshot.pendingPermission === null,
  );

  expect(question.state).toBe('requires_action');

  const elicitation = requireValue(
    question.pendingElicitation,
    'No Elicitation',
  );

  await host.caller.session.answerElicitation({
    ...created,
    requestId: elicitation.requestId,
    action: 'accept',
    content: { file: 'README.md' },
  });
  await expect
    .poll(() => elicitations)
    .toEqual([{ action: 'accept', content: { file: 'README.md' } }]);
  expect(
    await waitForAcpSnapshot(
      host,
      created.sessionId,
      (snapshot) => snapshot.pendingElicitation === null,
    ),
  ).toMatchObject({ state: 'running', pendingPermission: null });
  await expect(
    host.caller.session.answerElicitation({
      ...created,
      requestId: elicitation.requestId,
      action: 'decline',
    }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
  expect(permissions).toEqual([
    { outcome: { outcome: 'selected', optionId } },
    { outcome: { outcome: 'selected', optionId } },
  ]);
});
