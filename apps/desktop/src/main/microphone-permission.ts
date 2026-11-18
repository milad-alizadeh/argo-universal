import {
  systemPreferences,
  type MediaAccessPermissionRequest,
  type PermissionRequest,
  type Session,
} from 'electron';

type PermissionDetails = MediaAccessPermissionRequest | PermissionRequest;

type Request = {
  permission: string;
  requestingOrigin: string;
  audioOnly: boolean;
};

// The App's own page may use the microphone for a Voice call, and nothing else may use it, or the camera.
export function allowsMicrophone(
  request: Request,
  windowOrigin: string,
): boolean {
  return (
    request.permission === 'media' &&
    request.audioOnly &&
    request.requestingOrigin === windowOrigin
  );
}

const originOfUrl = (url: string): string =>
  URL.canParse(url) ? new URL(url).origin : '';

// On macOS the system asks the person the first time; a refusal answers the page as a refusal.
async function systemAllows(): Promise<boolean> {
  if (process.platform !== 'darwin') return true;

  return systemPreferences.askForMediaAccess('microphone');
}

// Only a request that names audio and nothing else is a microphone request.
const audioOnly = (details: PermissionDetails): boolean =>
  'mediaTypes' in details && details.mediaTypes?.every(isAudio) === true;

const isAudio = (type: string): boolean => type === 'audio';

const requestOf = (
  permission: string,
  details: PermissionDetails,
): Request => ({
  permission,
  requestingOrigin: originOfUrl(details.requestingUrl),
  audioOnly: audioOnly(details),
});

type Answer = (granted: boolean) => void;

function decide(request: Request, windowOrigin: string, answer: Answer): void {
  if (!allowsMicrophone(request, windowOrigin)) return answer(false);

  void systemAllows().then(answer, () => answer(false));
}

export function handleMicrophone(
  appSession: Session,
  windowOrigin: string,
): void {
  appSession.setPermissionRequestHandler((...[, permission, answer, details]) =>
    decide(requestOf(permission, details), windowOrigin, answer),
  );
}
