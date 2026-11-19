import { describe, expect, it } from 'vitest';
import {
  answerPermissionRequests,
  type MicrophoneSystem,
  type PermissionPort,
  type RequestDetails,
} from './microphone-permission';

const origin = 'http://127.0.0.1:7337';

const microphone: RequestDetails = {
  requestingUrl: `${origin}/session`,
  mediaTypes: ['audio'],
};

// A page asks for `permission`; resolves to what it was told, and how often the system was asked.
async function ask(
  permission: string,
  details: RequestDetails,
  system: Partial<MicrophoneSystem> = {},
): Promise<{ granted: boolean; systemAsked: number }> {
  let systemAsked = 0;
  let listener: Parameters<PermissionPort['onRequest']>[0] | undefined;

  answerPermissionRequests(
    {
      onRequest: (given): void => {
        listener = given;
      },
    },
    {
      windowOrigin: origin,
      system: {
        platform: 'darwin',
        askForMediaAccess: (): Promise<boolean> => {
          systemAsked += 1;

          return Promise.resolve(true);
        },
        ...system,
      },
    },
  );

  const granted = await new Promise<boolean>((resolve) =>
    listener?.(permission, details, resolve),
  );

  return { granted, systemAsked };
}

describe('microphone permission', () => {
  it('lets the App page use the microphone alone, after macOS has been asked', async () => {
    expect(await ask('media', microphone)).toEqual({
      granted: true,
      systemAsked: 1,
    });
  });

  it('refuses the page when the person refuses macOS', async () => {
    const refusing = {
      askForMediaAccess: (): Promise<boolean> => Promise.resolve(false),
    };

    expect((await ask('media', microphone, refusing)).granted).toBe(false);
  });

  it('refuses the page when macOS cannot be asked', async () => {
    const failing = {
      askForMediaAccess: (): Promise<boolean> =>
        Promise.reject(new Error('no access')),
    };

    expect((await ask('media', microphone, failing)).granted).toBe(false);
  });

  it('asks no system elsewhere than macOS', async () => {
    expect(await ask('media', microphone, { platform: 'linux' })).toEqual({
      granted: true,
      systemAsked: 0,
    });
  });

  it('refuses the camera, other pages and other permissions, without asking the system', async () => {
    const camera = { ...microphone, mediaTypes: ['audio', 'video'] };
    const stranger = { ...microphone, requestingUrl: 'https://example.com/' };

    for (const refused of [
      await ask('media', camera),
      await ask('media', stranger),
      await ask('geolocation', microphone),
    ])
      expect(refused).toEqual({ granted: false, systemAsked: 0 });
  });
});
