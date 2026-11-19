import { describe, expect, it } from 'vitest';
import { findCodex, type CodexPlaces } from './codex-program';

const onPath = '/usr/local/bin/codex';

const inChatGpt =
  '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex';

const notFound = 'Executable not found in PATH: codex';

const notOnPath = (): string => {
  throw new Error(notFound);
};

// A Mac with the ChatGPT app installed, and no Codex on PATH unless a test says so.
const mac = (places: Partial<CodexPlaces> = {}): CodexPlaces => ({
  codexPath: undefined,
  platform: 'darwin',
  onPath: notOnPath,
  isExecutable: (file) => file === inChatGpt,
  ...places,
});

describe('finding Codex', () => {
  it('takes the program CODEX_PATH names first', () => {
    expect(findCodex(mac({ codexPath: '/opt/codex' }))).toBe('/opt/codex');
  });

  it('takes Codex on PATH over the one inside the ChatGPT app', () => {
    expect(findCodex(mac({ onPath: () => onPath }))).toBe(onPath);
  });

  it('finds the Codex the ChatGPT app carries on a Mac with none on PATH', () => {
    expect(findCodex(mac())).toBe(inChatGpt);
  });

  it('finds none on a Mac without the ChatGPT app', () => {
    expect(() => findCodex(mac({ isExecutable: () => false }))).toThrow(
      notFound,
    );
  });

  it('looks for no Mac app on other platforms', () => {
    expect(() => findCodex(mac({ platform: 'linux' }))).toThrow(notFound);
  });
});
