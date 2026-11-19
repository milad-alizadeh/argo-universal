import { systemPreferences, type Session } from 'electron';

// What a page's permission request says, as far as the microphone is concerned.
export type RequestDetails = {
  requestingUrl: string;
  mediaTypes?: readonly string[];
};

type Answer = (granted: boolean) => void;

// Where permission requests arrive: the Electron session in the App, a fake in a test.
export type PermissionPort = {
  onRequest: (
    listener: (
      permission: string,
      details: RequestDetails,
      answer: Answer,
    ) => void,
  ) => void;
};

// The system's own say over the microphone: on macOS it asks the person the first time.
export type MicrophoneSystem = {
  platform: string;
  askForMediaAccess: (media: 'microphone') => Promise<boolean>;
};

type Request = {
  permission: string;
  requestingOrigin: string;
  audioOnly: boolean;
};

const originOfUrl = (url: string): string =>
  URL.canParse(url) ? new URL(url).origin : '';

const isAudio = (type: string): boolean => type === 'audio';

// Only a request that names audio and nothing else is a microphone request.
const audioOnly = (details: RequestDetails): boolean =>
  details.mediaTypes?.every(isAudio) === true;

const requestOf = (permission: string, details: RequestDetails): Request => ({
  permission,
  requestingOrigin: originOfUrl(details.requestingUrl),
  audioOnly: audioOnly(details),
});

// The App's own page may use the microphone for a Voice call, and nothing else may use it, or the camera.
const allowsMicrophone = (request: Request, windowOrigin: string): boolean =>
  request.permission === 'media' &&
  request.audioOnly &&
  request.requestingOrigin === windowOrigin;

// A refusal on macOS answers the page as a refusal; other systems leave the say to the page's origin alone.
const systemAllows = (system: MicrophoneSystem): Promise<boolean> =>
  system.platform === 'darwin'
    ? system.askForMediaAccess('microphone')
    : Promise.resolve(true);

type Context = { windowOrigin: string; system: MicrophoneSystem };

// Allows the App's own page the microphone when the system does; refuses every other request.
function answerRequest(
  request: Request,
  context: Context,
  answer: Answer,
): void {
  if (!allowsMicrophone(request, context.windowOrigin)) return answer(false);

  void systemAllows(context.system).then(answer, () => answer(false));
}

const electronSystem: MicrophoneSystem = {
  platform: process.platform,
  askForMediaAccess: (media) => systemPreferences.askForMediaAccess(media),
};

const electronPermissions = (appSession: Session): PermissionPort => ({
  onRequest: (listener) =>
    appSession.setPermissionRequestHandler(
      (...[, permission, answer, details]) =>
        listener(permission, details, answer),
    ),
});

export function answerPermissionRequests(
  permissions: PermissionPort,
  context: Context,
): void {
  permissions.onRequest((permission, details, answer) =>
    answerRequest(requestOf(permission, details), context, answer),
  );
}

// The App's own session: microphone requests from its page, answered by Electron and the system.
export const answerAppPermissionRequests = (
  appSession: Session,
  windowOrigin: string,
): void =>
  answerPermissionRequests(electronPermissions(appSession), {
    windowOrigin,
    system: electronSystem,
  });
