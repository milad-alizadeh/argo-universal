import { expect, it } from 'vitest';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import {
  answerPermission,
  askArchive,
  permissionJourney,
  permissionRow,
} from '#mocks/native-permission';

it.each(['completion', 'cancel', 'close'] as const)(
  'cancels an Argo Permission when the calling Turn ends through %s',
  async (ending) => {
    const journey = await permissionJourney();
    const { request, outcome } = await askArchive(journey);
    const { host, session } = journey;

    if (ending === 'completion') journey.release.resolve();
    else await host.caller.session[ending]({ sessionId: session.sessionId });
    expect(await outcome).toMatchObject([
      {
        status: 'rejected',
        reason: { message: 'The Permission request was cancelled' },
      },
    ]);

    if (ending !== 'close')
      await waitForAcpSessionIdle(host, session.sessionId);
    expect(await permissionRow(journey, request)).toMatchObject({
      state: 'settled',
      status: 'cancelled',
      _meta: { argo: { permissionOutcome: { outcome: 'cancelled' } } },
    });
    await expect(
      answerPermission(journey, request, 'allow_once'),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(
      (await host.caller.session.list({ archived: false })).sessions,
    ).toContainEqual(expect.objectContaining(journey.target));
  },
  30_000,
);
