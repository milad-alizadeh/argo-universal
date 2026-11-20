import type {
  AppScreenshotResult,
  ScreenRequester,
} from '@repo/contracts/operations';

// A Notice a capture writes into the Session's Feed; the picture itself never goes there.
export interface ScreenNotice {
  title: string;
  description: string;
}

type NotCaptured = Exclude<AppScreenshotResult, { status: 'captured' }>;

type Asker = Exclude<ScreenRequester, { kind: 'person' }>;

// Why no picture was taken, in the words the person reads in the Feed.
const missWords = {
  refused: 'No picture was taken: it was declined or screen sight is off.',
  not_opened: 'No picture was taken: no Argo desktop App could be reached.',
  not_available:
    'No picture was taken: this computer would not let Argo capture the screen.',
} as const;

const askerOf = (requester: Asker): string =>
  requester.kind === 'voice' ? 'The voice' : 'The Agent';

// The one Notice an Agent's or the voice's attempt leaves: that a capture was taken, or why none was.
export const noticeFor = (
  requester: Asker,
  result: AppScreenshotResult,
): ScreenNotice =>
  result.status === 'captured'
    ? {
        title: 'Screen captured',
        description: `${askerOf(requester)} looked at a picture of your screen.`,
      }
    : missedNotice(requester, result);

const missedNotice = (requester: Asker, result: NotCaptured): ScreenNotice => ({
  title: 'Screen not captured',
  description: `${askerOf(requester)} asked to see your screen. ${missWords[result.status]}`,
});
