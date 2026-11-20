import { desktopCapturer, type Session } from 'electron';
import { originOf } from './app-window';

// What a page's display-share request says, as far as screen sight is concerned.
export type DisplayRequest = {
  securityOrigin: string;
  videoRequested: boolean;
};

// A display the App may share; Electron's own source stands behind it.
export type Display = { id: string; name: string };

type Answer = (display: Display | null) => void;

// Where display-share requests arrive and the displays there are: Electron's session in the App, a fake in a test.
export type DisplayPort = {
  onRequest: (
    listener: (request: DisplayRequest, answer: Answer) => void,
  ) => void;
  displays: () => Promise<Display[]>;
};

// Only the App's own page, and only for a picture of a display: no audio and no window or tab.
const allows = (request: DisplayRequest, windowOrigin: string): boolean =>
  request.videoRequested && originOf(request.securityOrigin) === windowOrigin;

/*
 * The page asks to share a display for one screen capture (screen sight, ADR-0064). On macOS 15 and later the system's
 * own picker decides which display and asks the person; elsewhere the main display is shared. A request from any
 * other origin gets nothing.
 */
export function answerDisplayRequests(
  port: DisplayPort,
  windowOrigin: string,
): void {
  port.onRequest((request, answer) => {
    if (!allows(request, windowOrigin)) return answer(null);

    port.displays().then(
      ([main]) => answer(main ?? null),
      () => answer(null),
    );
  });
}

const electronDisplays = (appSession: Session): DisplayPort => ({
  onRequest: (listener) =>
    appSession.setDisplayMediaRequestHandler(
      (request, callback) =>
        listener(request, (display) =>
          callback(display ? { video: display } : {}),
        ),
      { useSystemPicker: true },
    ),
  displays: async () =>
    (await desktopCapturer.getSources({ types: ['screen'] })).map(
      ({ id, name }) => ({ id, name }),
    ),
});

// The App's own session: display-share requests from its page, answered by the system's picker or the main display.
export const answerAppDisplayRequests = (
  appSession: Session,
  windowOrigin: string,
): void => answerDisplayRequests(electronDisplays(appSession), windowOrigin);
