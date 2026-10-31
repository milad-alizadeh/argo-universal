import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { askOperation } from '#mocks/operation-permissions';
import { addOtherProject } from '#mocks/session-access';
import { delegationJourney, holdSession } from '#mocks/session-delegation';

it.each(['cancel', 'close'] as const)(
  'cancels an unanswered prompt Permission when the calling Session %ss, without target work',
  async (ending) => {
    const journey = await delegationJourney();
    // A Prompt inside the caller's own Project no longer asks, so the unanswered request needs another Project.
    const projectId = await addOtherProject(journey.host);

    const target = await journey.host.caller.session.new({
      ...emptySessionInput,
      projectId,
      prompt: [],
    });

    await holdSession(journey, journey.caller.sessionId);

    const asked = await askOperation(
      { host: journey.host, session: journey.caller },
      {
        id: 'session.prompt',
        params: {
          ...target,
          prompt: [{ type: 'text', text: 'Unapproved work' }],
        },
      },
    );

    await journey.host.caller.session[ending]({
      sessionId: journey.caller.sessionId,
    });

    if (ending === 'cancel')
      await waitForAcpSessionIdle(journey.host, journey.caller.sessionId);
    expect(await asked.outcome).toMatchObject([{ status: 'rejected' }]);
    expect(
      (await journey.host.caller.feed.page({ ...target, direction: 'tail' }))
        .rows,
    ).toEqual([]);
    await expect(
      journey.host.caller.session.answerPermission({
        sessionId: journey.caller.sessionId,
        requestId: asked.request.requestId,
        optionId: 'allow_once',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  },
  30_000,
);
