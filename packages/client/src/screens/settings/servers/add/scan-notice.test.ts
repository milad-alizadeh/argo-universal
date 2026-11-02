import { describe, expect, it } from 'vitest';
import { afterRead, cameraFailed, looking, noticeText } from './scan-notice';

describe('the scanner notice', () => {
  it('asks for the code until something is read', () => {
    expect(noticeText(looking)).toBe('Point the camera at the code');
  });

  it('goes back to asking once an Argo code is taken', () => {
    expect(afterRead(true, '{}')).toBe(looking);
  });

  it('says what it read when that is not an Argo code', () => {
    expect(noticeText(afterRead(false, 'https://example.com'))).toBe(
      'Read a code, but it is not an Argo code: https://example.com',
    );
  });

  it('cuts a long foreign code short', () => {
    const text = noticeText(afterRead(false, 'x'.repeat(100)));

    expect(text).toBe(
      `Read a code, but it is not an Argo code: ${'x'.repeat(28)}…`,
    );
  });

  it('says why the camera did not start', () => {
    expect(noticeText(cameraFailed('Camera in use'))).toBe(
      'The camera could not start: Camera in use',
    );
  });
});
