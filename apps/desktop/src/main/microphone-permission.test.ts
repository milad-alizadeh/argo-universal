import { describe, expect, it } from 'vitest';
import { allowsMicrophone } from './microphone-permission';

const origin = 'http://127.0.0.1:7337';

describe('microphone permission', () => {
  it('lets the App page use the microphone alone', () => {
    expect(
      allowsMicrophone(
        { permission: 'media', requestingOrigin: origin, audioOnly: true },
        origin,
      ),
    ).toBe(true);
  });

  it('refuses the camera, other pages and other permissions', () => {
    const own = { permission: 'media', requestingOrigin: origin };

    expect(allowsMicrophone({ ...own, audioOnly: false }, origin)).toBe(false);
    expect(
      allowsMicrophone(
        { ...own, requestingOrigin: 'https://example.com', audioOnly: true },
        origin,
      ),
    ).toBe(false);
    expect(
      allowsMicrophone(
        { ...own, permission: 'geolocation', audioOnly: true },
        origin,
      ),
    ).toBe(false);
  });
});
