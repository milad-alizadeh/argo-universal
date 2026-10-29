import type { PromptRequest } from '@agentclientprotocol/sdk';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { describe, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { uploadBlob, blobsFolderIn } from '../../blob';

describe.each(appFixtureAgentIds)('%s ACP lifecycle', (agentId) => {
  const sessionInput = { ...emptySessionInput, agent: agentId };
  it('prompted creation uses the owned ACP Session and returns local acknowledgement before completion', async () => {
    const completion = Promise.withResolvers<void>();
    const received = Promise.withResolvers<PromptRequest>();

    const host = await startAcpEngine(
      {
        steps: [],
        responses: {
          'session/prompt': [
            {
              received,
              waitFor: completion.promise,
              result: { stopReason: 'end_turn' },
            },
          ],
        },
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new({
      ...sessionInput,
      prompt: [{ type: 'text', text: 'Create and prompt' }],
    });

    const request = await received.promise;
    completion.resolve();
    expect(request).toEqual({
      sessionId: 'owned-1',
      prompt: [{ type: 'text', text: 'Create and prompt' }],
    });
    expect(
      host.database.$client
        .prepare('SELECT status FROM turn WHERE session_id = ?')
        .get(created.sessionId),
    ).toEqual({ status: 'running' });
  });
});

describe.each(appFixtureAgentIds)('%s ACP lifecycle', (agentId) => {
  const sessionInput = { ...emptySessionInput, agent: agentId };
  it('a negotiated image prompt delivers every byte from the stored Blob', async () => {
    const received = Promise.withResolvers<PromptRequest>();

    const host = await startAcpEngine(
      {
        initialize: {
          protocolVersion: 1,
          agentCapabilities: {
            promptCapabilities: { image: true },
            sessionCapabilities: { close: {} },
          },
        },
        steps: [],
        responses: { 'session/prompt': [{ received }] },
      },
      undefined,
      agentId,
    );

    const bytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3, 255]);

    const image = await uploadBlob(
      {
        databaseWriter: host.databaseWriter,
        blobsFolder: blobsFolderIn(host.home),
      },
      new Blob([bytes], { type: 'image/png' }),
    );

    const created = await host.caller.session.new(sessionInput);
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'image', mimeType: image.mime, blob: image }],
    });
    expect(await received.promise).toEqual({
      sessionId: 'owned-1',
      prompt: [{ type: 'image', mimeType: 'image/png', data: 'iVBORwECA/8=' }],
    });
    expect(
      host.database.$client
        .prepare(
          'SELECT blob_id, session_id FROM blob_ref WHERE session_id = ?',
        )
        .all(created.sessionId),
    ).toEqual([{ blob_id: image.blobId, session_id: created.sessionId }]);
  });
});
