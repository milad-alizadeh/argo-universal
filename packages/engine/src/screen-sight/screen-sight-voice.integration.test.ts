import type { SessionUpdate } from '@repo/contracts';
import { feedRow } from '@repo/db/schema';
import { expect, it } from 'vitest';
import {
  capturedImage,
  connectScreenSightApp,
  type ScreenSightApp,
  type ScreenSightAppOptions,
} from '#mocks/screen-sight-app';
import { startVoiceWork, type VoiceWork } from '#mocks/voice-work';
import {
  FakeVoiceProvider,
  type FakeVoiceMessage,
} from '../voice/fake-provider';
import { relayWords } from '../voice/relay-words';

type Setup = { images?: boolean; app?: ScreenSightAppOptions | null };

// A call in a Session, with a fake App that can capture unless the test says there is none.
type Call = { work: VoiceWork; app: ScreenSightApp | null };

// The fake App, connected and listening, unless the test says there is none.
async function connected(
  work: VoiceWork,
  options: ScreenSightAppOptions | null,
): Promise<ScreenSightApp | null> {
  if (!options) return null;
  const app = connectScreenSightApp(work.host.url, options);
  await app.ready;

  return app;
}

async function callWith(setup: Setup = {}): Promise<Call> {
  const { images, app } = { images: true, app: {}, ...setup };

  const work = await startVoiceWork([], {
    provider: new FakeVoiceProvider({ connect: 'manual', images }),
  });

  const listening = await connected(work, app);
  await work.start();

  return { work, app: listening };
}

const replyTo = (
  work: VoiceWork,
  requestId: string,
): FakeVoiceMessage | undefined =>
  work.provider.call.sent.find(
    (say) => say.kind === 'reply' && say.requestId === requestId,
  );

const notices = async (work: VoiceWork): Promise<SessionUpdate[]> =>
  (await work.feed()).filter(
    (row) => row.sessionUpdate === 'notice' && row.title === 'Screen captured',
  );

const missedNotices = async (work: VoiceWork): Promise<SessionUpdate[]> =>
  (await work.feed()).filter(
    (row) =>
      row.sessionUpdate === 'notice' && row.title === 'Screen not captured',
  );

const storedFeed = (work: VoiceWork): string =>
  JSON.stringify(work.host.database.select().from(feedRow).all());

const lookAtThis = (work: VoiceWork, requestId = 'f1'): void => {
  work.provider.call.personSays('Look at this');
  work.provider.call.requestFrame(requestId);
};

it('gives the voice the picture when the person asked, with one Notice and no image in the Feed', async () => {
  const { work, app } = await callWith();

  lookAtThis(work);

  await expect.poll(() => work.provider.call.images).toEqual([capturedImage]);
  expect(app?.asked).toMatchObject([
    { requester: { kind: 'voice', sessionId: work.sessionId } },
  ]);
  expect(replyTo(work, 'f1')).toMatchObject({ text: relayWords.looked });
  await expect.poll(async () => (await notices(work)).length).toBe(1);
  expect(storedFeed(work)).not.toContain(capturedImage.data);
}, 30_000);

it('keeps nothing after the call ends', async () => {
  const { work } = await callWith();
  lookAtThis(work);
  await expect.poll(() => work.provider.call.images).toHaveLength(1);

  await work.host.caller.voice.end({ sessionId: work.sessionId });

  expect(storedFeed(work)).not.toContain(capturedImage.data);
  expect(JSON.stringify(await work.host.caller.voice.status())).not.toContain(
    capturedImage.data,
  );
}, 30_000);

it('sends nothing to a provider that cannot take images, and captures nothing', async () => {
  const { work, app } = await callWith({ images: false });

  lookAtThis(work);

  await expect.poll(() => replyTo(work, 'f1')).toBeDefined();
  expect(replyTo(work, 'f1')).toMatchObject({ text: relayWords.noImages });
  expect(work.provider.call.look).toBeUndefined();
  expect(app?.asked).toEqual([]);
  expect(await notices(work)).toEqual([]);
}, 30_000);

it('says it is off, and sends nothing, when the App says screen sight is off', async () => {
  const { work, app } = await callWith({ app: { enabled: false } });

  lookAtThis(work);

  await expect.poll(() => replyTo(work, 'f1')).toBeDefined();
  expect(replyTo(work, 'f1')).toMatchObject({ text: relayWords.screenOff });
  expect(app?.asked).toHaveLength(1);
  expect(work.provider.call.images).toEqual([]);
  expect(await notices(work)).toEqual([]);
  await expect.poll(async () => (await missedNotices(work)).length).toBe(1);
}, 30_000);

it('says no App is reachable, and sends nothing', async () => {
  const { work } = await callWith({ app: null });

  lookAtThis(work);

  await expect.poll(() => replyTo(work, 'f1')).toBeDefined();

  expect(replyTo(work, 'f1')).toMatchObject({
    text: relayWords.screenUnreachable,
  });
  expect(work.provider.call.images).toEqual([]);
}, 30_000);

it('sends nothing when the App cannot capture', async () => {
  const { work } = await callWith({
    app: {
      answer: () => ({
        status: 'not_available',
        reason: 'No picture came back.',
      }),
    },
  });

  lookAtThis(work);

  await expect.poll(() => replyTo(work, 'f1')).toBeDefined();
  expect(replyTo(work, 'f1')).toMatchObject({
    text: relayWords.screenUnavailable('No picture came back.'),
  });
  expect(work.provider.call.images).toEqual([]);
  expect(await notices(work)).toEqual([]);
  await expect.poll(async () => (await missedNotices(work)).length).toBe(1);
}, 30_000);
